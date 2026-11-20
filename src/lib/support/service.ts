import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLogs, partnerMembers, supportMessages, supportTickets, users } from "@/lib/db/schema";
import {
  cleanSubject,
  isAutomatedSender,
  parseAddress,
  replySubject,
  statusAfter,
  ticketNumberFromSubject,
  ticketTag,
  type InboundEmail,
} from "@/lib/domain/support";
import { adminBaseUrl } from "@/lib/domain/admin-host";
import { sendEmail } from "@/lib/notify";
import { logError } from "@/lib/domain/log";

/**
 * Assistenza: un ticket nasce dal modulo del sito, dall'Area Partner o da un'email alla casella
 * dell'assistenza. Le risposte del team partono per email con [geco #N] nell'oggetto, così la risposta
 * del cliente torna sullo stesso ticket (webhook /api/assistenza/email).
 */

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

/** Casella dell'assistenza: indirizzo mostrato sul sito e "rispondi a" delle nostre email. */
export function supportEmail(): string {
  return process.env.SUPPORT_EMAIL?.trim() || "assistenza@gecoitalia.it";
}

/** Le email che arrivano dai nostri indirizzi non aprono ticket: niente giri infiniti di risposte automatiche. */
function ownAddresses(): string[] {
  return [supportEmail(), process.env.EMAIL_FROM ?? ""].flatMap((a) => parseAddress(a)?.email ?? []);
}

type Channel = "web" | "email" | "partner_area";

export type NewTicket = {
  subject: string;
  body: string;
  topic: string;
  channel: Channel;
  requesterName: string;
  requesterEmail: string;
  /** Utente della sessione: solo così l'identità è verificata. */
  sessionUserId?: string | null;
  emailMessageId?: string | null;
};

/**
 * Account e azienda di chi scrive. Con la sessione l'identità è certa; dall'email solo probabile
 * (il mittente di un'email o di un modulo si può falsificare: il Backoffice lo segnala).
 */
async function accountFor(email: string, sessionUserId?: string | null) {
  const [u] = sessionUserId
    ? [{ id: sessionUserId }]
    : await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!u) return { userId: null, partnerId: null };
  const [m] = await db.select({ partnerId: partnerMembers.partnerId }).from(partnerMembers).where(eq(partnerMembers.userId, u.id)).limit(1);
  return { userId: u.id, partnerId: m?.partnerId ?? null };
}

/** Gli avvisi non devono mai far fallire l'operazione: si registra l'errore e si va avanti. */
async function quietly(what: string, send: () => Promise<void>) {
  try {
    await send();
  } catch (e) {
    logError(`[assistenza] ${what} non inviata:`, e);
  }
}

/** Avviso al team su una casella personale (SUPPORT_ALERT_EMAIL), con il link diretto al ticket. */
async function alertTeam(number: number, title: string, from: string, body: string) {
  const to = process.env.SUPPORT_ALERT_EMAIL?.trim();
  if (!to) return;
  await quietly("email di avviso al team", () =>
    sendEmail(to, `${title} ${ticketTag(number)}`, `${from} ha scritto:\n\n${body.slice(0, 1500)}\n\nApri nel gestionale: ${adminBaseUrl(process.env.ADMIN_URL, appUrl())}/assistenza/${number}`),
  );
}

export async function openTicket(input: NewTicket): Promise<{ id: string; number: number }> {
  const email = input.requesterEmail.trim().toLowerCase();
  const account = await accountFor(email, input.sessionUserId);
  const subject = cleanSubject(input.subject) || "Richiesta di assistenza";
  const now = new Date();
  const ticket = await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(supportTickets)
      .values({
        subject,
        topic: input.topic,
        channel: input.channel,
        requesterName: input.requesterName,
        requesterEmail: email,
        userId: account.userId,
        partnerId: account.partnerId,
        lastMessageAt: now,
        createdAt: now,
      })
      .returning({ id: supportTickets.id, number: supportTickets.number });
    await tx.insert(supportMessages).values({
      ticketId: t.id,
      kind: "inbound",
      authorName: input.requesterName,
      authorUserId: input.sessionUserId ?? null,
      body: input.body,
      emailMessageId: input.emailMessageId ?? null,
      createdAt: now,
    });
    await tx.insert(auditLogs).values({ actor: email, action: "support.ticket_opened", entity: "support_ticket", entityId: t.id, data: { number: t.number, channel: input.channel } });
    return t;
  });

  const areaLink = account.partnerId ? `\nTrovi la conversazione anche nell'Area Partner: ${appUrl()}/area-partner/assistenza/${ticket.number}\n` : "";
  await quietly("conferma al cliente", () =>
    sendEmail(
      email,
      replySubject(subject, ticket.number),
      `Ciao ${input.requesterName.split(" ")[0]},\nabbiamo ricevuto la tua richiesta: ti rispondiamo entro un giorno lavorativo.\n\nNumero della richiesta: #${ticket.number}\nOggetto: ${subject}\n${areaLink}\nPer aggiungere dettagli rispondi a questa email lasciando ${ticketTag(ticket.number)} nell'oggetto.\n\nIl team di GecoItalia`,
      { replyTo: supportEmail() },
    ),
  );
  await alertTeam(ticket.number, "Nuova richiesta di assistenza", `${input.requesterName} <${email}>`, input.body);
  return ticket;
}

/** Nuovo messaggio di chi ha aperto il ticket (email di risposta o Area Partner): il ticket torna "da rispondere". */
async function appendInbound(
  ticket: { id: string; number: number; status: "open" | "waiting" | "resolved" },
  msg: { authorName: string; authorEmail: string; authorUserId: string | null; body: string; emailMessageId: string | null },
) {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(supportMessages).values({
      ticketId: ticket.id,
      kind: "inbound",
      authorName: msg.authorName,
      authorUserId: msg.authorUserId,
      body: msg.body,
      emailMessageId: msg.emailMessageId,
      createdAt: now,
    });
    await tx.update(supportTickets).set({ status: statusAfter(ticket.status, "inbound"), lastMessageAt: now }).where(eq(supportTickets.id, ticket.id));
  });
  await alertTeam(ticket.number, "Nuovo messaggio", `${msg.authorName} <${msg.authorEmail}>`, msg.body);
}

export type ReceiveResult = { ticket: number; created: boolean } | { ignored: string };

/**
 * Email arrivata alla casella dell'assistenza. Con [geco #N] nell'oggetto e lo stesso mittente si
 * aggiunge al ticket N; altrimenti apre un ticket nuovo. La stessa email consegnata due volte conta una volta.
 */
export async function receiveEmail(mail: InboundEmail): Promise<ReceiveResult> {
  if (isAutomatedSender(mail.fromEmail, ownAddresses())) return { ignored: "mittente automatico o nostro" };
  if (mail.messageId) {
    const [dup] = await db
      .select({ number: supportTickets.number })
      .from(supportMessages)
      .innerJoin(supportTickets, eq(supportTickets.id, supportMessages.ticketId))
      .where(eq(supportMessages.emailMessageId, mail.messageId))
      .limit(1);
    if (dup) return { ticket: dup.number, created: false };
  }
  const body = mail.text || "(email senza testo)";
  const name = mail.fromName ?? mail.fromEmail;
  const n = ticketNumberFromSubject(mail.subject);
  if (n) {
    // Solo chi ha aperto il ticket può aggiungervi messaggi: un altro mittente apre un ticket suo.
    const [t] = await db
      .select({ id: supportTickets.id, number: supportTickets.number, status: supportTickets.status })
      .from(supportTickets)
      .where(and(eq(supportTickets.number, n), eq(supportTickets.requesterEmail, mail.fromEmail)))
      .limit(1);
    if (t) {
      await appendInbound(t, { authorName: name, authorEmail: mail.fromEmail, authorUserId: null, body, emailMessageId: mail.messageId });
      return { ticket: t.number, created: false };
    }
  }
  const t = await openTicket({
    channel: "email",
    subject: mail.subject || "Email senza oggetto",
    topic: "other",
    body,
    requesterName: name,
    requesterEmail: mail.fromEmail,
    emailMessageId: mail.messageId,
  });
  return { ticket: t.number, created: true };
}

/** Il partner risponde dall'Area Partner a un ticket della sua azienda. */
export async function replyFromPartner(partnerId: string, number: number, user: { id: string; name: string; email: string }, body: string): Promise<boolean> {
  const [t] = await db
    .select({ id: supportTickets.id, number: supportTickets.number, status: supportTickets.status })
    .from(supportTickets)
    .where(and(eq(supportTickets.number, number), eq(supportTickets.partnerId, partnerId)))
    .limit(1);
  if (!t) return false;
  await appendInbound(t, { authorName: user.name, authorEmail: user.email, authorUserId: user.id, body, emailMessageId: null });
  return true;
}

/**
 * Risposta del team: si salva sul ticket, che passa "in attesa del cliente", e parte per email a chi
 * ha scritto. Se l'email non parte la risposta resta salvata e il Backoffice mostra l'errore.
 */
export async function replyToTicket(ticketId: string, admin: { id: string; name: string; email: string }, body: string): Promise<{ emailError?: string } | null> {
  const [t] = await db
    .select({ id: supportTickets.id, number: supportTickets.number, subject: supportTickets.subject, status: supportTickets.status, requesterEmail: supportTickets.requesterEmail, partnerId: supportTickets.partnerId })
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  if (!t) return null;
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(supportMessages).values({ ticketId: t.id, kind: "reply", authorName: admin.name, authorUserId: admin.id, body, createdAt: now });
    await tx.update(supportTickets).set({ status: statusAfter(t.status, "reply"), lastMessageAt: now }).where(eq(supportTickets.id, t.id));
    await tx.insert(auditLogs).values({ actor: admin.email, action: "support.reply", entity: "support_ticket", entityId: t.id, data: { number: t.number } });
  });

  const areaLink = t.partnerId ? `\n\nTrovi tutta la conversazione anche nell'Area Partner: ${appUrl()}/area-partner/assistenza/${t.number}` : "";
  try {
    await sendEmail(
      t.requesterEmail,
      replySubject(t.subject, t.number),
      `${body}\n\n${admin.name.split(" ")[0]} · Assistenza geco${areaLink}\n\nPer rispondere, rispondi a questa email lasciando ${ticketTag(t.number)} nell'oggetto.`,
      { replyTo: supportEmail() },
    );
  } catch (e) {
    logError("[assistenza] risposta non inviata per email:", e);
    return { emailError: e instanceof Error ? e.message : String(e) };
  }
  return {};
}
