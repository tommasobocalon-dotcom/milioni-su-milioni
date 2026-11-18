import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { asClient } from "@/lib/db/tenant";
import {
  auditLogs,
  categories,
  leads,
  municipalities,
  oauthAccounts,
  otpCodes,
  partnerMembers,
  partners,
  supportMessages,
  supportTickets,
  users,
} from "@/lib/db/schema";

/**
 * Diritti GDPR del cliente (art. 15, 17, 20, 21): scaricare i propri dati, cancellare l'account, togliere il consenso
 * al marketing. Le richieste di contatto sono legate all'email, non all'account: contano solo se l'email è confermata,
 * altrimenti chi si registra con l'email di un altro vedrebbe (o cancellerebbe) le sue richieste.
 * Letture e consenso passano da asClient: la RLS del database applica la stessa regola anche se una query sbaglia filtro.
 * La cancellazione dell'account resta sul ruolo dell'app: tocca utenti, ticket e registro attività.
 */

async function account(userId: string) {
  const [u] = await db
    .select({ id: users.id, email: users.email, name: users.name, phone: users.phone, role: users.role, emailVerifiedAt: users.emailVerifiedAt, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return u ?? null;
}

/** Tutto quello che il sito sa del cliente, in un oggetto da scaricare come JSON. */
export async function exportClientData(userId: string) {
  return asClient(userId, async (tx) => {
    const [u] = await tx
      .select({ email: users.email, name: users.name, phone: users.phone, emailVerifiedAt: users.emailVerifiedAt, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u) return null;
    const logins = await tx.select({ provider: oauthAccounts.provider, createdAt: oauthAccounts.createdAt }).from(oauthAccounts).where(eq(oauthAccounts.userId, userId));
    // Con l'email non confermata la RLS non restituisce richieste.
    const requests = await tx
      .select({
        id: leads.id,
        createdAt: leads.createdAt,
        company: partners.displayName,
        category: categories.name,
        municipality: municipalities.name,
        requestType: leads.requestType,
        answers: leads.answers,
        description: leads.description,
        timing: leads.timing,
        callbackSlot: leads.callbackSlot,
        name: leads.clientName,
        email: leads.clientEmail,
        phone: leads.clientPhone,
        privacyConsent: leads.privacyConsent,
        marketingConsent: leads.marketingConsent,
        verifiedAt: leads.verifiedAt,
        deliveredAt: leads.deliveredAt,
        clientContacted: leads.clientContacted,
      })
      .from(leads)
      .innerJoin(partners, eq(partners.id, leads.partnerId))
      .innerJoin(categories, eq(categories.id, leads.categoryId))
      .innerJoin(municipalities, eq(municipalities.id, leads.municipalityId))
      .where(eq(leads.clientEmail, u.email))
      .orderBy(leads.createdAt);
    const tickets = await tx
      .select({ id: supportTickets.id, number: supportTickets.number, subject: supportTickets.subject, status: supportTickets.status, createdAt: supportTickets.createdAt })
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(supportTickets.createdAt);
    // Le note interne dell'assistenza non sono dati del cliente: restano fuori (anche per la RLS).
    const messages = tickets.length
      ? await tx
          .select({ ticketId: supportMessages.ticketId, kind: supportMessages.kind, author: supportMessages.authorName, body: supportMessages.body, createdAt: supportMessages.createdAt })
          .from(supportMessages)
          .where(and(inArray(supportMessages.ticketId, tickets.map((t) => t.id)), inArray(supportMessages.kind, ["inbound", "reply"])))
          .orderBy(supportMessages.createdAt)
      : [];
    return {
      exportedAt: new Date().toISOString(),
      account: { email: u.email, name: u.name, phone: u.phone, emailVerifiedAt: u.emailVerifiedAt, createdAt: u.createdAt, logins },
      requests,
      ...(u.emailVerifiedAt ? {} : { note: "Conferma la tua email per vedere anche le richieste di contatto inviate con questo indirizzo." }),
      support: tickets.map(({ id, ...t }) => ({ ...t, messages: messages.filter((m) => m.ticketId === id).map((m) => ({ kind: m.kind, author: m.author, body: m.body, createdAt: m.createdAt })) })),
    };
  });
}

/** Consenso al marketing dato nelle richieste di contatto: true se almeno una richiesta lo ha. */
export async function marketingConsentOf(email: string): Promise<boolean> {
  const [row] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.clientEmail, email), eq(leads.marketingConsent, true))).limit(1);
  return !!row;
}

/** Toglie il consenso al marketing da tutte le richieste dell'email (si può solo togliere: si dà nel modulo). */
export async function revokeMarketingConsent(userId: string): Promise<boolean> {
  const u = await account(userId);
  if (!u?.emailVerifiedAt) return false;
  await asClient(userId, (tx) => tx.update(leads).set({ marketingConsent: false }).where(eq(leads.clientEmail, u.email)));
  await db.insert(auditLogs).values({ actor: `user:${userId}`, action: "consent.marketing_revoked", entity: "user", entityId: userId });
  return true;
}

export type DeleteOutcome = "deleted" | "partner" | "admin" | "missing";

/**
 * Cancella l'account del cliente. Le richieste inviate restano alle aziende (lavoro, stato, note) ma senza nome,
 * contatti, descrizione e risposte; i ticket dell'assistenza perdono nome, email e testo dei messaggi del cliente.
 * Chi gestisce un'azienda o il gestionale passa dall'assistenza: ci sono abbonamento, fatture e dati di altri.
 */
export async function deleteClientAccount(userId: string): Promise<DeleteOutcome> {
  const u = await account(userId);
  if (!u) return "missing";
  if (u.role === "admin" || u.role === "sales") return "admin";
  const [member] = await db.select({ id: partnerMembers.partnerId }).from(partnerMembers).where(eq(partnerMembers.userId, userId)).limit(1);
  if (member) return "partner";

  await db.transaction(async (tx) => {
    if (u.emailVerifiedAt) {
      await tx
        .update(leads)
        .set({
          clientName: "Cliente cancellato",
          clientEmail: "",
          clientPhone: "",
          description: null,
          answers: [],
          marketingConsent: false,
          // Niente più email "Com'è andata?" a un indirizzo che non c'è.
          followUpSentAt: sql`coalesce(${leads.followUpSentAt}, now())`,
        })
        .where(eq(leads.clientEmail, u.email));
      await tx.delete(otpCodes).where(eq(otpCodes.target, u.email));
    }
    const tickets = tx.select({ id: supportTickets.id }).from(supportTickets).where(eq(supportTickets.userId, userId));
    await tx
      .update(supportMessages)
      .set({ body: "[messaggio cancellato su richiesta del cliente]", authorName: "Cliente cancellato" })
      .where(and(inArray(supportMessages.ticketId, tickets), eq(supportMessages.kind, "inbound")));
    await tx.update(supportTickets).set({ requesterName: "Cliente cancellato", requesterEmail: "" }).where(eq(supportTickets.userId, userId));
    // Sessioni, link monouso e accessi Google/Apple se ne vanno con l'utente (on delete cascade).
    await tx.delete(users).where(eq(users.id, userId));
    await tx.insert(auditLogs).values({ actor: `user:${userId}`, action: "account.deleted", entity: "user", entityId: userId });
  });
  return "deleted";
}
