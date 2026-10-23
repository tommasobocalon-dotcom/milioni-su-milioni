"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePartner } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { auditLogs, leadEvents, leads, subscriptions, tokenLedger } from "@/lib/db/schema";
import { canReportLead, REPORT_REASONS } from "@/lib/domain/lead-rules";
import { TOKEN_PACKAGES } from "@/lib/domain/offers";
import { tokenExpiryFrom } from "@/lib/domain/tokens";
import { LeadNotUnlockableError, unlockLead } from "@/lib/leads/service";
import { LEAD_STATUSES, statusInfo } from "@/lib/leads/status";

const Id = z.uuid();

/** Il lead deve appartenere al partner della sessione ed essere stato consegnato. */
async function ownLead(partnerId: string, leadId: string) {
  if (!Id.safeParse(leadId).success) return null;
  const [lead] = await db
    .select({ id: leads.id, status: leads.status, deliveredAt: leads.deliveredAt, reportStatus: leads.reportStatus, charge: leads.charge })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.partnerId, partnerId), isNotNull(leads.deliveredAt)));
  return lead ?? null;
}

export async function markLeadSeen(leadId: string) {
  const { user, partner } = await requirePartner();
  const lead = await ownLead(partner.id, leadId);
  if (!lead || lead.status !== "new") return;
  await db.update(leads).set({ status: "seen" }).where(eq(leads.id, lead.id));
  await db.insert(leadEvents).values({ leadId: lead.id, type: "seen", message: `Lead aperto da ${user.name}`, actor: user.name });
  revalidatePath("/area-partner", "layout");
}

const StatusSchema = z.enum(LEAD_STATUSES.map((s) => s.value) as [string, ...string[]]);

export async function updateLeadStatus(leadId: string, formData: FormData) {
  const { user, partner } = await requirePartner();
  const status = StatusSchema.safeParse(formData.get("status"));
  const lead = await ownLead(partner.id, leadId);
  if (!lead || !status.success || lead.charge === "locked") return;
  if (lead.status === status.data) return;
  await db.update(leads).set({ status: status.data as (typeof LEAD_STATUSES)[number]["value"] }).where(eq(leads.id, lead.id));
  await db.insert(leadEvents).values({
    leadId: lead.id,
    type: "status",
    message: `Stato cambiato in "${statusInfo(status.data).label}"`,
    actor: user.name,
  });
  revalidatePath("/area-partner", "layout");
}

export async function saveLeadNotes(leadId: string, formData: FormData) {
  const { partner } = await requirePartner();
  const notes = z.string().max(2000).safeParse(String(formData.get("notes") ?? "").trim());
  const lead = await ownLead(partner.id, leadId);
  if (!lead || !notes.success) return;
  await db.update(leads).set({ notes: notes.data || null }).where(eq(leads.id, lead.id));
  revalidatePath(`/area-partner/lead/${lead.id}`);
}

export type ReportState = { ok?: boolean; error?: string };

export async function reportLead(leadId: string, _prev: ReportState, formData: FormData): Promise<ReportState> {
  const { user, partner } = await requirePartner();
  const reason = REPORT_REASONS.find((r) => r.value === formData.get("reason"));
  const lead = await ownLead(partner.id, leadId);
  if (!lead) return { error: "Lead non trovato" };
  if (!reason) return { error: "Scegli un motivo tra quelli previsti" };
  if (lead.reportStatus) return { error: "Hai già segnalato questo lead" };
  const now = new Date();
  if (!canReportLead(lead.deliveredAt, now)) return { error: "Sono passate più di 72 ore dalla consegna: non è più possibile segnalarlo" };
  await db.update(leads).set({ reportReason: reason.value, reportStatus: "open", reportedAt: now }).where(eq(leads.id, lead.id));
  await db.insert(leadEvents).values({ leadId: lead.id, type: "reported", message: `Segnalato: ${reason.label}`, actor: user.name, createdAt: now });
  await db.insert(auditLogs).values({ actor: user.email, action: "lead.report", entity: "lead", entityId: lead.id, data: { reason: reason.value } });
  revalidatePath(`/area-partner/lead/${lead.id}`);
  return { ok: true };
}

export type UnlockState = { error?: string };

export async function unlockLeadAction(leadId: string): Promise<UnlockState> {
  const { user, partner } = await requirePartner();
  if (!Id.safeParse(leadId).success) return { error: "Lead non valido" };
  try {
    await unlockLead(partner.id, leadId, user.name);
  } catch (e) {
    if (e instanceof LeadNotUnlockableError) return { error: e.message };
    throw e;
  }
  revalidatePath("/area-partner", "layout");
  return {};
}

/**
 * Solo in sviluppo: accredita un pacchetto senza pagamento, per provare il flusso dei token.
 * In produzione l'accredito arriva dal webhook Stripe checkout.session.completed.
 */
export async function simulateTokenPurchase(code: string) {
  if (process.env.NODE_ENV === "production") return;
  const { user, partner } = await requirePartner();
  const pkg = TOKEN_PACKAGES.find((p) => p.code === code);
  if (!pkg) return;
  const now = new Date();
  await db.insert(tokenLedger).values({
    partnerId: partner.id,
    kind: "purchase",
    amount: pkg.tokens,
    expiresAt: tokenExpiryFrom(now),
    reference: `Pacchetto ${pkg.name} (acquisto di prova)`,
    createdAt: now,
  });
  await db.insert(auditLogs).values({ actor: user.email, action: "tokens.simulated_purchase", entity: "partner", entityId: partner.id, data: { code } });
  revalidatePath("/area-partner", "layout");
}

export async function setAutoUseTokens(formData: FormData) {
  const { partner, memberRole } = await requirePartner();
  if (memberRole !== "owner") return;
  const on = formData.get("auto") === "on";
  await db.update(subscriptions).set({ autoUseTokens: on }).where(eq(subscriptions.partnerId, partner.id));
  revalidatePath("/area-partner", "layout");
}
