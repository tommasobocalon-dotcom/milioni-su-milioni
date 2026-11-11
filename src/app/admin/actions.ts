"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/app/accedi/actions";
import { destroySession, requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { auditLogs, leadEvents, leads, partners, subscriptions, supportMessages, supportTickets } from "@/lib/db/schema";

import { accountStatusFrom } from "@/lib/domain/billing";
import { REPORT_REASONS } from "@/lib/domain/lead-rules";
import { MESSAGE_MAX, TICKET_STATUSES } from "@/lib/domain/support";

import { replyToTicket } from "@/lib/support/service";
import type { FormState } from "@/components/ui/message-form";

/**
 * Azioni del Backoffice. Ognuna passa da requireAdmin(), valida l'input e lascia una riga nel
 * registro attività (PRD §10, "Audit log di tutte le azioni amministrative").
 */

const Id = z.uuid();

export type AdminSignInState = { error: string; field?: "email" | "password"; email: string } | null;

/**
 * Accesso al gestionale come azione del modulo: funziona anche se si preme "Entra" prima che la pagina
 * abbia caricato JavaScript, e la password viaggia sempre nel corpo della richiesta, mai nell'indirizzo.
 */
export async function adminSignIn(_prev: AdminSignInState, formData: FormData): Promise<AdminSignInState> {
  const email = String(formData.get("email") ?? "");
  const res = await signIn(email, String(formData.get("password") ?? ""), "/admin");
  return { error: res.error, field: res.field === "name" ? undefined : res.field, email };
}

/** Esce e torna alla pagina di accesso del gestionale (non a quella del sito). */
export async function logoutAdmin() {
  await destroySession("client");
  await destroySession("business");
  redirect("/admin/accedi");
}
const Body = z.string().trim().min(2, "Scrivi il messaggio").max(MESSAGE_MAX, "Messaggio troppo lungo");

async function ticketNumber(ticketId: string) {
  const [t] = await db.select({ number: supportTickets.number }).from(supportTickets).where(eq(supportTickets.id, ticketId));
  return t?.number ?? null;
}

/** Scheda pubblica e risultati di ricerca del partner, dopo un cambio di stato o badge. */
async function refreshPartnerPages(partnerId: string) {
  const [p] = await db.select({ slug: partners.slug }).from(partners).where(eq(partners.id, partnerId));
  if (p) updateTag(`partner:${p.slug}`);
  updateTag("catalog");
  revalidatePath("/admin", "layout");
}

function refreshTicket(number: number) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/area-partner/assistenza/${number}`);
}

export async function replyTicketAction(ticketId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!Id.safeParse(ticketId).success) return { error: "Ticket non valido" };
  const body = Body.safeParse(formData.get("body"));
  if (!body.success) return { error: body.error.issues[0].message };
  const result = await replyToTicket(ticketId, admin, body.data);
  if (!result) return { error: "Ticket non trovato" };
  const number = await ticketNumber(ticketId);
  if (number) refreshTicket(number);
  if (result.emailError) return { error: `Risposta salvata, ma l'email non è partita: ${result.emailError}` };
  return { ok: "Risposta inviata" };
}

export async function addTicketNoteAction(ticketId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!Id.safeParse(ticketId).success) return { error: "Ticket non valido" };
  const body = Body.safeParse(formData.get("body"));
  if (!body.success) return { error: body.error.issues[0].message };
  const number = await ticketNumber(ticketId);
  if (!number) return { error: "Ticket non trovato" };
  await db.insert(supportMessages).values({ ticketId, kind: "note", authorName: admin.name, authorUserId: admin.id, body: body.data });
  refreshTicket(number);
  return { ok: "Nota salvata" };
}

const TicketStatus = z.enum(TICKET_STATUSES.map((s) => s.value));

export async function setTicketStatusAction(ticketId: string, formData: FormData) {
  const admin = await requireAdmin();
  const status = TicketStatus.safeParse(formData.get("status"));
  if (!Id.safeParse(ticketId).success || !status.success) return;
  const [t] = await db.update(supportTickets).set({ status: status.data }).where(eq(supportTickets.id, ticketId)).returning({ number: supportTickets.number });
  if (!t) return;
  await db.insert(auditLogs).values({ actor: admin.email, action: "support.status", entity: "support_ticket", entityId: ticketId, data: { status: status.data } });
  refreshTicket(t.number);
}

/** Prende in carico il ticket (o lo rilascia se era già suo). */
export async function toggleTicketAssigneeAction(ticketId: string) {
  const admin = await requireAdmin();
  if (!Id.safeParse(ticketId).success) return;
  const [t] = await db.select({ number: supportTickets.number, assigneeId: supportTickets.assigneeId }).from(supportTickets).where(eq(supportTickets.id, ticketId));
  if (!t) return;
  await db
    .update(supportTickets)
    .set({ assigneeId: t.assigneeId === admin.id ? null : admin.id })
    .where(eq(supportTickets.id, ticketId));
  refreshTicket(t.number);
}

// ---------------------------------------------------------------------------
// Partner
// ---------------------------------------------------------------------------

const Verification = z.enum(["verified", "rejected", "pending"]);

/** Badge "Verificato" sulla scheda pubblica, dopo il controllo del team (documenti, P.IVA, sede). */
export async function setVerificationAction(partnerId: string, formData: FormData) {
  const admin = await requireAdmin();
  const status = Verification.safeParse(formData.get("status"));
  if (!Id.safeParse(partnerId).success || !status.success) return;
  const [p] = await db.update(partners).set({ verificationStatus: status.data }).where(eq(partners.id, partnerId)).returning({ id: partners.id });
  if (!p) return;
  await db.insert(auditLogs).values({ actor: admin.email, action: "partner.verification", entity: "partner", entityId: partnerId, data: { status: status.data } });
  await refreshPartnerPages(partnerId);
}

/**
 * Sospensione manuale: la scheda sparisce dalle ricerche e i nuovi lead non vengono consegnati.
 * La riattivazione rimette lo stato che deriva dall'abbonamento: senza abbonamento attivo resta fuori.
 */
export async function setAccountStatusAction(partnerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!Id.safeParse(partnerId).success) return { error: "Partner non valido" };
  const action = formData.get("action");
  let next: "suspended" | "activating" | "active" | "cancelled";
  if (action === "suspend") {
    next = "suspended";
  } else if (action === "reactivate") {
    const subs = await db
      .select({ status: subscriptions.status })
      .from(subscriptions)
      .where(and(eq(subscriptions.partnerId, partnerId), inArray(subscriptions.status, ["active", "suspended", "activating"])));
    next = subs.length ? accountStatusFrom(subs.map((s) => s.status)) : "activating";
    if (next !== "active") return { error: "Nessun abbonamento pagato: il partner torna attivo da solo quando paga il piano." };
  } else {
    return { error: "Azione non valida" };
  }
  const [p] = await db.update(partners).set({ accountStatus: next }).where(eq(partners.id, partnerId)).returning({ id: partners.id });
  if (!p) return { error: "Partner non trovato" };
  await db.insert(auditLogs).values({ actor: admin.email, action: `partner.${action}`, entity: "partner", entityId: partnerId, data: { status: next } });
  await refreshPartnerPages(partnerId);
  return { ok: next === "suspended" ? "Partner sospeso" : "Partner riattivato" };
}

// ---------------------------------------------------------------------------
// Moderazione: segnalazioni dei lead
// ---------------------------------------------------------------------------

/**
 * Decisione su un lead segnalato dal partner (PRD §7.4). Se la segnalazione è accolta il lead viene
 * restituito e non conta più tra quelli ricevuti.
 */
export async function resolveLeadReportAction(leadId: string, formData: FormData) {
  const admin = await requireAdmin();
  const decision = formData.get("decision");
  if (!Id.safeParse(leadId).success || (decision !== "accept" && decision !== "reject")) return;
  const now = new Date();
  await db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).for("update");
    if (!lead || lead.reportStatus !== "open") return;
    const reason = REPORT_REASONS.find((r) => r.value === lead.reportReason)?.label ?? lead.reportReason;
    if (decision === "reject") {
      await tx.update(leads).set({ reportStatus: "rejected" }).where(eq(leads.id, lead.id));
      await tx.insert(leadEvents).values({ leadId: lead.id, type: "report_rejected", message: `Segnalazione respinta (${reason}): il lead resta conteggiato`, actor: "Assistenza geco", createdAt: now });
    } else {
      const refunded = lead.charge === "token" || lead.charge === "quota";
      await tx.update(leads).set({ reportStatus: "accepted", charge: refunded ? "refunded" : lead.charge }).where(eq(leads.id, lead.id));
      await tx.insert(leadEvents).values({
        leadId: lead.id,
        type: "report_accepted",
        message: "Segnalazione accolta",
        actor: "Assistenza geco",
        createdAt: now,
      });
    }
    await tx.insert(auditLogs).values({ actor: admin.email, action: `lead.report_${decision}`, entity: "lead", entityId: lead.id, data: { partnerId: lead.partnerId } });
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/area-partner", "layout");
}
