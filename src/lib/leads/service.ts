import "server-only";
import { and, eq, gt, isNotNull, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leadEvents, leads, partners, plans, subscriptions, tokenLedger, type LeadAnswer } from "@/lib/db/schema";
import { decideLeadCharge, isDuplicateLead, TOKEN_COST_PER_LEAD, DUPLICATE_WINDOW_DAYS } from "@/lib/domain/lead-rules";
import { InsufficientTokensError, planConsumption, tokenBalance, type LedgerEntry } from "@/lib/domain/tokens";

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

export type ConfirmOutcome = "delivered" | "token" | "locked" | "duplicate" | "redirect";

/**
 * Lead verificato con OTP: applica le regole di conteggio (PRD §7.4) e lo consegna al partner.
 * Tutto in una transazione, con la riga dell'abbonamento bloccata per non sforare la quota.
 */
export async function confirmLead(leadId: string, now = new Date()): Promise<{ outcome: ConfirmOutcome; partnerId: string }> {
  return db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).for("update");
    if (!lead) throw new Error("Richiesta non trovata");
    if (lead.verifiedAt) {
      const outcome: ConfirmOutcome =
        lead.charge === "duplicate" ? "duplicate" : lead.charge === "locked" ? "locked" : lead.charge === "pending" ? "redirect" : "delivered";
      return { outcome, partnerId: lead.partnerId };
    }

    const [partner] = await tx.select({ accountStatus: partners.accountStatus }).from(partners).where(eq(partners.id, lead.partnerId));
    const [sub] = await tx
      .select({ id: subscriptions.id, leadsUsed: subscriptions.leadsUsed, autoUseTokens: subscriptions.autoUseTokens, leadsIncluded: plans.leadsIncluded })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(and(eq(subscriptions.partnerId, lead.partnerId), eq(subscriptions.status, "active")))
      .for("update", { of: subscriptions });

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

    const ledger = await ledgerFor(tx, lead.partnerId);
    const decision = decideLeadCharge({
      accountActive: partner?.accountStatus === "active" && !!sub,
      isDuplicate: duplicate,
      quotaUsed: sub?.leadsUsed ?? 0,
      quotaIncluded: sub?.leadsIncluded ?? 0,
      tokenBalance: tokenBalance(ledger, now),
      autoUseTokens: sub?.autoUseTokens ?? false,
      tokenCostPerLead: TOKEN_COST_PER_LEAD,
      now,
    });

    const events: { type: string; message: string; actor: string }[] = [
      { type: "verified", message: "Richiesta inviata e verificata con codice SMS", actor: "Cliente" },
    ];
    let outcome: ConfirmOutcome;

    switch (decision.kind) {
      case "quota":
        await tx.update(subscriptions).set({ leadsUsed: (sub!.leadsUsed ?? 0) + 1 }).where(eq(subscriptions.id, sub!.id));
        await tx.update(leads).set({ verifiedAt: now, deliveredAt: now, charge: "quota" }).where(eq(leads.id, lead.id));
        events.push({ type: "delivered", message: "Conteggiato nella quota del piano e consegnato al partner", actor: "Sistema" });
        outcome = "delivered";
        break;
      case "token":
        await debitTokens(tx, lead.partnerId, decision.tokens, `Lead oltre quota ${lead.id.slice(0, 8)}`, now);
        await tx.update(leads).set({ verifiedAt: now, deliveredAt: now, charge: "token", tokensCharged: decision.tokens }).where(eq(leads.id, lead.id));
        events.push({ type: "delivered", message: `Oltre quota: ${decision.tokens} token usati in automatico`, actor: "Sistema" });
        outcome = "token";
        break;
      case "locked":
        await tx.update(leads).set({ verifiedAt: now, deliveredAt: now, charge: "locked", unlockExpiresAt: decision.unlockExpiresAt }).where(eq(leads.id, lead.id));
        events.push({ type: "locked", message: "Oltre la quota del piano: contatti nascosti per 48 ore, sbloccabili con i token", actor: "Sistema" });
        outcome = "locked";
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

export class LeadNotUnlockableError extends Error {}

/** Il partner sblocca con i token un lead arrivato oltre quota, entro le 48 ore. */
export async function unlockLead(partnerId: string, leadId: string, actor: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(and(eq(leads.id, leadId), eq(leads.partnerId, partnerId))).for("update");
    if (!lead || lead.charge !== "locked") throw new LeadNotUnlockableError("Questo lead non è da sbloccare");
    if (!lead.unlockExpiresAt || lead.unlockExpiresAt.getTime() <= now.getTime()) {
      throw new LeadNotUnlockableError("Il tempo per sbloccare questo lead è scaduto");
    }
    try {
      await debitTokens(tx, partnerId, TOKEN_COST_PER_LEAD, `Sblocco lead ${lead.id.slice(0, 8)}`, now);
    } catch (e) {
      if (e instanceof InsufficientTokensError) throw new LeadNotUnlockableError(`Servono ${e.requested} token, ne hai ${e.available}`);
      throw e;
    }
    await tx.update(leads).set({ charge: "token", tokensCharged: TOKEN_COST_PER_LEAD, unlockExpiresAt: null }).where(eq(leads.id, lead.id));
    await tx.insert(leadEvents).values({ leadId: lead.id, type: "unlocked", message: `Sbloccato con ${TOKEN_COST_PER_LEAD} token`, actor, createdAt: now });
  });
}
