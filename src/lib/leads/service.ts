import "server-only";
import { and, count, desc, eq, gt, inArray, isNotNull, ne, or, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { areaExtensions, boosts, leadEvents, leads, municipalities, partners, provinces, subscriptions, type LeadAnswer } from "@/lib/db/schema";
import { type BoostPlacement } from "@/lib/domain/offers";
import { FREE_LEADS, freeLeadsLeft } from "@/lib/domain/free-plan";
import { listingStatus } from "@/lib/domain/billing";
import { decideLeadCharge, isDuplicateLead, DUPLICATE_WINDOW_DAYS } from "@/lib/domain/lead-rules";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

export type ConfirmOutcome = "delivered" | "duplicate" | "redirect";

/**
 * Richieste consegnate con i contatti: sono quelle che il piano gratuito conta (in tutto, non al mese, dal 21/11/2026).
 * Una segnalazione accolta non conta. Il gratuito è solo per chi non ha mai avuto un abbonamento, quindi basta contarle tutte.
 */
export async function freeLeadsUsed(tx: Tx | typeof db, partnerId: string): Promise<number> {
  const [row] = await tx
    .select({ n: count() })
    .from(leads)
    .where(
      and(
        eq(leads.partnerId, partnerId),
        eq(leads.charge, "quota"),
        or(isNull(leads.reportStatus), ne(leads.reportStatus, "accepted")),
      ),
    );
  return row?.n ?? 0;
}

/**
 * Piano gratuito arrivato alle 3 richieste (soci, 21/11/2026): finisce, l'abbonamento gratuito e la scheda passano a
 * "suspended", così la scheda sparisce dalla ricerca e l'Area Partner si riduce alla pagina Abbonamento (requirePartner)
 * finché l'azienda non paga un piano (syncSubscription chiude il gratuito). Se una segnalazione accolta lo riporta sotto
 * le 3, riparte. Restituisce true se lo stato è cambiato.
 */
export async function syncFreePlan(tx: Tx, partnerId: string): Promise<boolean> {
  const [sub] = await tx
    .select({ id: subscriptions.id, status: subscriptions.status })
    .from(subscriptions)
    .where(and(eq(subscriptions.partnerId, partnerId), eq(subscriptions.free, true), inArray(subscriptions.status, ["active", "suspended"])));
  if (!sub) return false;
  const status = (await freeLeadsUsed(tx, partnerId)) >= FREE_LEADS ? "suspended" : "active";
  if (status === sub.status) return false;
  await tx.update(subscriptions).set({ status }).where(eq(subscriptions.id, sub.id));
  const [p] = await tx.select({ accountStatus: partners.accountStatus, verification: partners.verificationStatus }).from(partners).where(eq(partners.id, partnerId)).for("update");
  // Partner sospeso col gratuito ancora attivo = sospensione a mano del team: resta com'è.
  if (p && !(p.accountStatus === "suspended" && sub.status === "active"))
    await tx.update(partners).set({ accountStatus: listingStatus(status, p.verification) }).where(eq(partners.id, partnerId));
  return true;
}

/** Scelto un piano a pagamento, le richieste arrivate bloccate col piano gratuito mostrano i contatti. */
export async function unlockLeads(tx: Tx, partnerId: string, now = new Date()) {
  const unlocked = await tx
    .update(leads)
    .set({ charge: "quota" })
    .where(and(eq(leads.partnerId, partnerId), eq(leads.charge, "locked")))
    .returning({ id: leads.id });
  if (unlocked.length > 0)
    await tx.insert(leadEvents).values(unlocked.map((l) => ({ leadId: l.id, type: "unlocked", message: "Contatti del cliente sbloccati con il piano a pagamento", actor: "Sistema", createdAt: now })));
}

/**
 * Lead verificato con OTP: lo consegna al partner (gratis e senza quota, decisione del 4/11/2026),
 * salvo duplicati e partner non attivi. Col piano gratuito, alla 3ª richiesta il piano finisce (syncFreePlan,
 * `freeEnded`); "locked" (consegnata senza contatti) resta solo per richieste confermate insieme. Tutto in una transazione.
 */
export async function confirmLead(leadId: string, now = new Date()): Promise<{ outcome: ConfirmOutcome; partnerId: string; freeEnded?: boolean }> {
  return db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).for("update");
    if (!lead) throw new Error("Richiesta non trovata");
    if (lead.verifiedAt) {
      const outcome: ConfirmOutcome =
        lead.charge === "duplicate" ? "duplicate" : lead.charge === "pending" ? "redirect" : "delivered";
      return { outcome, partnerId: lead.partnerId };
    }

    // Riga del partner bloccata: due richieste confermate insieme non superano le 3 gratuite.
    const [partner] = await tx.select({ accountStatus: partners.accountStatus }).from(partners).where(eq(partners.id, lead.partnerId)).for("update");
    const [sub] = await tx
      .select({ id: subscriptions.id, free: subscriptions.free })
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

    const decision = decideLeadCharge({
      accountActive: partner?.accountStatus === "active" && !!sub,
      isDuplicate: duplicate,
      freeLeadsLeft: sub?.free ? freeLeadsLeft(await freeLeadsUsed(tx, lead.partnerId)) : null,
    });

    const events: { type: string; message: string; actor: string }[] = [
      { type: "verified", message: "Richiesta inviata e confermata con codice via email", actor: "Cliente" },
    ];
    let outcome: ConfirmOutcome;
    let freeEnded = false;

    switch (decision.kind) {
      case "quota":
        await tx.update(leads).set({ verifiedAt: now, deliveredAt: now, charge: "quota" }).where(eq(leads.id, lead.id));
        events.push({ type: "delivered", message: "Richiesta consegnata", actor: "Sistema" });
        outcome = "delivered";
        if (sub?.free) freeEnded = await syncFreePlan(tx, lead.partnerId);
        break;
      case "locked":
        await tx.update(leads).set({ verifiedAt: now, deliveredAt: now, charge: "locked" }).where(eq(leads.id, lead.id));
        events.push({ type: "delivered", message: "Richiesta consegnata senza contatti: le 3 gratuite sono già usate", actor: "Sistema" });
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
    return { outcome, partnerId: lead.partnerId, freeEnded };
  });
}

export class ExtraNotActivatableError extends Error {}

/** Riga del partner bloccata fino alla fine della transazione, con categoria e provincia per i boost. */
async function lockPartner(tx: Tx, partnerId: string) {
  const [p] = await tx
    .select({ categoryId: partners.categoryId, provinceId: municipalities.provinceId })
    .from(partners)
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .where(eq(partners.id, partnerId))
    .for("update", { of: partners });
  if (!p) throw new ExtraNotActivatableError("Partner non trovato");
  return p;
}

/**
 * Logo in evidenza in Home per `days` giorni, già pagato con Stripe: va chiamata dentro la transazione che segna
 * il pagamento come elaborato, così non si aggiunge due volte. Nessun controllo sul piano: il pagamento è avvenuto.
 */
export async function grantHomeSponsor(tx: Tx, partnerId: string, days: number, now = new Date()) {
  const p = await lockPartner(tx, partnerId);
  return insertBoost(tx, partnerId, p, "home", days * 86_400_000, 0, now);
}

/** Boost "Sponsorizzato nella ricerca" per `hours` ore, già pagato con Stripe: stesse regole di grantHomeSponsor. */
export async function grantSearchBoost(tx: Tx, partnerId: string, hours: number, now = new Date()) {
  const p = await lockPartner(tx, partnerId);
  return insertBoost(tx, partnerId, p, "search", hours * 3_600_000, 0, now);
}

/** Se un boost dello stesso tipo è già attivo, il nuovo parte alla sua scadenza (si allunga, non si sovrappone). */
async function insertBoost(
  tx: Tx,
  partnerId: string,
  p: { categoryId: string; provinceId: number },
  placement: BoostPlacement,
  durationMs: number,
  tokensSpent: number,
  now: Date,
) {
  const [last] = await tx
    .select({ endsAt: boosts.endsAt })
    .from(boosts)
    .where(and(eq(boosts.partnerId, partnerId), eq(boosts.placement, placement), gt(boosts.endsAt, now)))
    .orderBy(desc(boosts.endsAt))
    .limit(1);
  const startsAt = last?.endsAt ?? now;
  const endsAt = new Date(startsAt.getTime() + durationMs);
  await tx.insert(boosts).values({ partnerId, placement, categoryId: p.categoryId, provinceId: p.provinceId, startsAt, endsAt, tokensSpent, createdAt: now });
  return { startsAt, endsAt };
}

/**
 * Estensione territoriale già pagata con Stripe: per ogni provincia la scheda compare nelle ricerche dei suoi comuni per
 * `days` giorni; se in quella provincia c'è già un'estensione in corso, il nuovo periodo parte alla sua scadenza. Va chiamata
 * dentro la transazione che segna il pagamento come elaborato. I codici che non sono province del database vengono ignorati.
 */
export async function grantAreaExtensions(tx: Tx, partnerId: string, provinceIds: number[], days: number, now = new Date()) {
  await lockPartner(tx, partnerId);
  const known = await tx.select({ id: provinces.id }).from(provinces).where(inArray(provinces.id, provinceIds));
  for (const { id } of known) {
    const [last] = await tx
      .select({ endsAt: areaExtensions.endsAt })
      .from(areaExtensions)
      .where(and(eq(areaExtensions.partnerId, partnerId), eq(areaExtensions.provinceId, id), gt(areaExtensions.endsAt, now)))
      .orderBy(desc(areaExtensions.endsAt))
      .limit(1);
    const startsAt = last?.endsAt ?? now;
    const endsAt = new Date(startsAt.getTime() + days * 86_400_000);
    await tx.insert(areaExtensions).values({ partnerId, provinceId: id, startsAt, endsAt, tokensSpent: 0, createdAt: now });
  }
  return known.length;
}

