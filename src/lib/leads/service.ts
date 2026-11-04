import "server-only";
import { and, desc, eq, gt, isNotNull, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { areaExtensions, boosts, leadEvents, leads, municipalities, partners, plans, portfolioItems, provinces, showcaseFeatures, subscriptions, tokenLedger, type LeadAnswer } from "@/lib/db/schema";
import { neighbourProvinces } from "@/lib/domain/extras";
import { AREA_EXTENSION, BOOST_OPTIONS, SHOWCASE_OPTIONS } from "@/lib/domain/offers";
import { decideLeadCharge, isDuplicateLead, DUPLICATE_WINDOW_DAYS } from "@/lib/domain/lead-rules";
import { canBoost } from "@/lib/domain/ranking";
import { InsufficientTokensError, planConsumption, type LedgerEntry } from "@/lib/domain/tokens";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type NewLead = {
  partnerId: string;
  categoryId: string;
  serviceId: string | null;
  municipalityId: number;
  requestType: string;
  answers: LeadAnswer[];
  description: string | null;
  timing: string;
  callbackSlot: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  privacyConsent: true;
  marketingConsent: boolean;
};

/** Salva la richiesta in attesa di verifica OTP: non diventa un lead finché il numero non è verificato. */
export async function createPendingLead(input: NewLead): Promise<string> {
  const [row] = await db.insert(leads).values({ ...input, charge: "pending" }).returning({ id: leads.id });
  return row.id;
}

async function ledgerFor(tx: Tx, partnerId: string): Promise<LedgerEntry[]> {
  const rows = await tx.select().from(tokenLedger).where(eq(tokenLedger.partnerId, partnerId));
  return rows.map((r) => ({ id: r.id, kind: r.kind, amount: r.amount, lotId: r.lotId, expiresAt: r.expiresAt, createdAt: r.createdAt }));
}

async function debitTokens(tx: Tx, partnerId: string, amount: number, reference: string, now: Date) {
  const plan = planConsumption(await ledgerFor(tx, partnerId), amount, now);
  await tx.insert(tokenLedger).values(plan.map((d) => ({ partnerId, kind: "consume" as const, amount: d.amount, lotId: d.lotId, reference, createdAt: now })));
}

export type ConfirmOutcome = "delivered" | "duplicate" | "redirect";

/**
 * Lead verificato con OTP: lo consegna al partner (gratis e senza quota, decisione del 4/11/2026),
 * salvo duplicati e partner non attivi. Tutto in una transazione.
 */
export async function confirmLead(leadId: string, now = new Date()): Promise<{ outcome: ConfirmOutcome; partnerId: string }> {
  return db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).for("update");
    if (!lead) throw new Error("Richiesta non trovata");
    if (lead.verifiedAt) {
      const outcome: ConfirmOutcome =
        lead.charge === "duplicate" ? "duplicate" : lead.charge === "pending" ? "redirect" : "delivered";
      return { outcome, partnerId: lead.partnerId };
    }

    const [partner] = await tx.select({ accountStatus: partners.accountStatus }).from(partners).where(eq(partners.id, lead.partnerId));
    const [sub] = await tx
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(eq(subscriptions.partnerId, lead.partnerId), eq(subscriptions.status, "active")));

    const since = new Date(now.getTime() - DUPLICATE_WINDOW_DAYS * 24 * 3600_000);
    const previous = await tx
      .select({ partnerId: leads.partnerId, serviceId: leads.serviceId, categoryId: leads.categoryId, clientPhone: leads.clientPhone, clientEmail: leads.clientEmail, createdAt: leads.createdAt })
      .from(leads)
      .where(and(eq(leads.partnerId, lead.partnerId), isNotNull(leads.verifiedAt), ne(leads.id, lead.id), gt(leads.createdAt, since)));
    const key = (l: { serviceId: string | null; categoryId: string }) => l.serviceId ?? `cat:${l.categoryId}`;
    const duplicate = isDuplicateLead(
      previous.map((p) => ({ ...p, serviceKey: key(p) })),
      { partnerId: lead.partnerId, serviceKey: key(lead), clientPhone: lead.clientPhone, clientEmail: lead.clientEmail, createdAt: now },
    );

    const decision = decideLeadCharge({ accountActive: partner?.accountStatus === "active" && !!sub, isDuplicate: duplicate });

    const events: { type: string; message: string; actor: string }[] = [
      { type: "verified", message: "Richiesta inviata e verificata con codice SMS", actor: "Cliente" },
    ];
    let outcome: ConfirmOutcome;

    switch (decision.kind) {
      case "quota":
        await tx.update(leads).set({ verifiedAt: now, deliveredAt: now, charge: "quota" }).where(eq(leads.id, lead.id));
        events.push({ type: "delivered", message: "Richiesta consegnata", actor: "Sistema" });
        outcome = "delivered";
        break;
      case "duplicate":
        await tx.update(leads).set({ verifiedAt: now, charge: "duplicate" }).where(eq(leads.id, lead.id));
        events.push({ type: "duplicate", message: "Duplicato di una richiesta degli ultimi 30 giorni: annullato senza costi", actor: "Sistema" });
        outcome = "duplicate";
        break;
      case "redirect":
        await tx.update(leads).set({ verifiedAt: now }).where(eq(leads.id, lead.id));
        events.push({ type: "redirected", message: "Partner non attivo: al cliente proponiamo alternative", actor: "Sistema" });
        outcome = "redirect";
        break;
    }

    await tx.insert(leadEvents).values(events.map((e) => ({ ...e, leadId: lead.id, createdAt: now })));
    return { outcome, partnerId: lead.partnerId };
  });
}

export class ExtraNotActivatableError extends Error {}

/**
 * Per gli extra a token (boost, provincia vicina, Ispirazione): blocca la riga del partner, così due
 * acquisti insieme non si sovrappongono, e controlla che il piano attivo li consenta (Normal e Premium).
 */
async function lockPartnerForExtra(tx: Tx, partnerId: string) {
  const [p] = await tx
    .select({ categoryId: partners.categoryId, provinceId: municipalities.provinceId })
    .from(partners)
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .where(eq(partners.id, partnerId))
    .for("update", { of: partners });
  if (!p) throw new ExtraNotActivatableError("Partner non trovato");
  const [plan] = await tx
    .select({ weight: plans.visibilityWeight })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(eq(subscriptions.partnerId, partnerId), eq(subscriptions.status, "active")));
  if (!plan || !canBoost(plan.weight)) throw new ExtraNotActivatableError("Gli extra con i crediti sono inclusi nei piani Normal e Premium");
  return p;
}

async function payExtra(tx: Tx, partnerId: string, tokens: number, reference: string, now: Date) {
  try {
    await debitTokens(tx, partnerId, tokens, reference, now);
  } catch (e) {
    if (e instanceof InsufficientTokensError) throw new ExtraNotActivatableError(`Servono ${e.requested} crediti, ne hai ${e.available}`);
    throw e;
  }
}

/**
 * Boost della scheda pagato a token (solo Normal e Premium), per la categoria e la provincia del partner.
 * Se un boost è già attivo, il nuovo parte alla sua scadenza (si allunga, non si sovrappone).
 */
export async function activateBoost(partnerId: string, hours: number, now = new Date()) {
  const option = BOOST_OPTIONS.find((o) => o.hours === hours);
  if (!option) throw new ExtraNotActivatableError("Durata non valida");
  return db.transaction(async (tx) => {
    const p = await lockPartnerForExtra(tx, partnerId);
    const [last] = await tx
      .select({ endsAt: boosts.endsAt })
      .from(boosts)
      .where(and(eq(boosts.partnerId, partnerId), gt(boosts.endsAt, now)))
      .orderBy(desc(boosts.endsAt))
      .limit(1);
    const startsAt = last?.endsAt ?? now;
    const endsAt = new Date(startsAt.getTime() + option.hours * 3_600_000);
    await payExtra(tx, partnerId, option.tokens, `Boost ${option.hours} ore`, now);
    await tx.insert(boosts).values({ partnerId, categoryId: p.categoryId, provinceId: p.provinceId, startsAt, endsAt, tokensSpent: option.tokens, createdAt: now });
    return { startsAt, endsAt };
  });
}

/** La scheda compare per 30 giorni anche in una provincia confinante; se è già attiva lì, si allunga. */
export async function activateAreaExtension(partnerId: string, provinceId: number, now = new Date()) {
  return db.transaction(async (tx) => {
    const p = await lockPartnerForExtra(tx, partnerId);
    const [home] = await tx.select({ code: provinces.code }).from(provinces).where(eq(provinces.id, p.provinceId));
    const [target] = await tx.select({ code: provinces.code, name: provinces.name }).from(provinces).where(eq(provinces.id, provinceId));
    if (!home || !target || !neighbourProvinces(home.code).includes(target.code)) {
      throw new ExtraNotActivatableError("Puoi aggiungere solo una provincia confinante con la tua");
    }
    const [last] = await tx
      .select({ endsAt: areaExtensions.endsAt })
      .from(areaExtensions)
      .where(and(eq(areaExtensions.partnerId, partnerId), eq(areaExtensions.provinceId, provinceId), gt(areaExtensions.endsAt, now)))
      .orderBy(desc(areaExtensions.endsAt))
      .limit(1);
    const startsAt = last?.endsAt ?? now;
    const endsAt = new Date(startsAt.getTime() + AREA_EXTENSION.days * 86_400_000);
    await payExtra(tx, partnerId, AREA_EXTENSION.tokens, `Provincia di ${target.name} per ${AREA_EXTENSION.days} giorni`, now);
    await tx.insert(areaExtensions).values({ partnerId, provinceId, startsAt, endsAt, tokensSpent: AREA_EXTENSION.tokens, createdAt: now });
    return { endsAt, provinceName: target.name };
  });
}

/** Un lavoro del portfolio (con foto) in evidenza nella pagina Ispirazione per 7 o 30 giorni. */
export async function activateShowcase(partnerId: string, portfolioItemId: string, days: number, now = new Date()) {
  const option = SHOWCASE_OPTIONS.find((o) => o.days === days);
  if (!option) throw new ExtraNotActivatableError("Durata non valida");
  return db.transaction(async (tx) => {
    await lockPartnerForExtra(tx, partnerId);
    const [item] = await tx
      .select({ title: portfolioItems.title, imageUrl: portfolioItems.imageUrl })
      .from(portfolioItems)
      .where(and(eq(portfolioItems.id, portfolioItemId), eq(portfolioItems.partnerId, partnerId)));
    if (!item) throw new ExtraNotActivatableError("Lavoro non trovato");
    if (!item.imageUrl) throw new ExtraNotActivatableError("Serve un lavoro con la foto");
    const [last] = await tx
      .select({ endsAt: showcaseFeatures.endsAt })
      .from(showcaseFeatures)
      .where(and(eq(showcaseFeatures.portfolioItemId, portfolioItemId), gt(showcaseFeatures.endsAt, now)))
      .orderBy(desc(showcaseFeatures.endsAt))
      .limit(1);
    const startsAt = last?.endsAt ?? now;
    const endsAt = new Date(startsAt.getTime() + option.days * 86_400_000);
    await payExtra(tx, partnerId, option.tokens, `Ispirazione ${option.days} giorni: ${item.title}`.slice(0, 120), now);
    await tx.insert(showcaseFeatures).values({ partnerId, portfolioItemId, startsAt, endsAt, tokensSpent: option.tokens, createdAt: now });
    return { endsAt };
  });
}
