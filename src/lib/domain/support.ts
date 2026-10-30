/**
 * Assistenza (ticket). Regole pure: numero del ticket nell'oggetto delle email, lettura delle email
 * in arrivo dai diversi provider, pulizia delle risposte citate, stato dopo ogni messaggio.
 */

export const TICKET_STATUSES = [
  { value: "open", label: "Da rispondere" },
  { value: "waiting", label: "In attesa del cliente" },
  { value: "resolved", label: "Risolto" },
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number]["value"];

export const ticketStatusLabel = (s: TicketStatus) => TICKET_STATUSES.find((t) => t.value === s)!.label;

export const TICKET_TOPICS = [
  { value: "account", label: "Accesso e account" },
  { value: "payments", label: "Abbonamento, pagamenti e fatture" },
  { value: "leads", label: "Richieste di contatto e lead" },
  { value: "listing", label: "Scheda, listino e recensioni" },
  { value: "other", label: "Altro" },
] as const;

export type TicketTopic = (typeof TICKET_TOPICS)[number]["value"];

export const topicLabel = (t: string) => TICKET_TOPICS.find((x) => x.value === t)?.label ?? "Altro";

export const TICKET_CHANNEL_LABEL = { web: "Modulo del sito", email: "Email", partner_area: "Area Partner" } as const;

/** Lunghezza massima di un messaggio salvato: le email lunghissime (firme, catene) vengono tagliate. */
export const MESSAGE_MAX = 20_000;

const TAG = /\[geco #(\d{1,9})\]/i;

/** Etichetta nell'oggetto delle email: la risposta del cliente torna sullo stesso ticket. */
export const ticketTag = (n: number) => `[geco #${n}]`;

export function ticketNumberFromSubject(subject: string): number | null {
  const m = TAG.exec(subject);
  return m ? Number(m[1]) : null;
}

/** Oggetto senza etichetta del ticket né prefissi "Re:", "R:", "Fwd:", "I:". */
export function cleanSubject(subject: string): string {
  return subject
    .replace(TAG, " ")
    .replace(/^\s*((re|r|fwd?|i|aw|wg)\s*:\s*)+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export function replySubject(subject: string, n: number): string {
  return `Re: ${cleanSubject(subject) || "Richiesta di assistenza"} ${ticketTag(n)}`;
}

/** "Il giorno … ha scritto:" (Gmail, Apple Mail in italiano) e "On … wrote:", anche spezzato su due righe. */
const QUOTE_INTRO = /^(il giorno|on)\b/i;
const QUOTE_INTRO_END = /(ha scritto|wrote)\s*:\s*$/i;
/** Intestazione di Outlook: "Da: …" seguita da "Inviato:" / "Sent:" / "Data:". */
const OUTLOOK_FROM = /^(da|from)\s*:/i;
const OUTLOOK_NEXT = /^(inviato|sent|data|date)\s*:/i;
const ORIGINAL_MESSAGE = /^-{2,}\s*(messaggio originale|original message)\s*-{2,}$/i;

/**
 * Tiene solo il testo nuovo di una risposta email: toglie la citazione del messaggio precedente e le
 * righe che iniziano con ">". Se non resta niente, restituisce il testo com'era.
 */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const next = (lines[i + 1] ?? "").trim();
    if (QUOTE_INTRO.test(t) && (QUOTE_INTRO_END.test(t) || QUOTE_INTRO_END.test(next))) break;
    if (ORIGINAL_MESSAGE.test(t)) break;
    if (OUTLOOK_FROM.test(t) && OUTLOOK_NEXT.test(next)) break;
    if (t.startsWith(">")) continue;
    kept.push(lines[i]);
  }
  const result = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return result || text.trim();
}

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** "Mario Rossi <mario@x.it>", "\"Rossi, Mario\" <mario@x.it>" oppure solo "mario@x.it". */
export function parseAddress(raw: string): { email: string; name: string | null } | null {
  const value = raw.trim();
  const angle = /^(.*)<([^<>]+)>\s*$/.exec(value);
  const email = (angle ? angle[2] : value).trim().toLowerCase();
  if (!EMAIL.test(email)) return null;
  const name = angle ? angle[1].trim().replace(/^"(.*)"$/, "$1").trim() : "";
  return { email, name: name || null };
}

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'" };

/** Testo leggibile da un'email solo HTML (quando il provider non manda la versione testo). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/g, (_, e: string) => ENTITIES[e])
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type InboundEmail = { fromEmail: string; fromName: string | null; subject: string; text: string; messageId: string | null };

const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Email in arrivo alla casella dell'assistenza, da qualunque provider: Postmark (From, TextBody…),
 * Resend (from, text, html, message_id) o un inoltro generico con gli stessi nomi in minuscolo.
 */
export function parseInboundEmail(payload: unknown): InboundEmail | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const postmark = "From" in p || "FromFull" in p;

  let from: { email: string; name: string | null } | null;
  let subject: string;
  let text: string;
  let messageId: string;
  if (postmark) {
    const full = (p.FromFull ?? {}) as Record<string, unknown>;
    from = parseAddress(str(full.Email) || str(p.From));
    if (from && !from.name) from.name = str(full.Name) || str(p.FromName) || null;
    subject = str(p.Subject);
    text = str(p.StrippedTextReply) || str(p.TextBody) || htmlToText(str(p.HtmlBody));
    messageId = str(p.MessageID);
  } else {
    const rawFrom = p.from;
    if (rawFrom && typeof rawFrom === "object") {
      const f = rawFrom as Record<string, unknown>;
      from = parseAddress(str(f.email));
      if (from) from.name = str(f.name) || null;
    } else {
      from = parseAddress(str(rawFrom));
    }
    if (from && !from.name) from.name = str(p.name) || null;
    subject = str(p.subject);
    text = str(p.text) || htmlToText(str(p.html));
    messageId = str(p.message_id) || str(p.messageId);
  }
  if (!from) return null;

  const body = stripQuotedReply(text).slice(0, MESSAGE_MAX);
  if (!body && !subject.trim()) return null;
  return { fromEmail: from.email, fromName: from.name, subject: subject.trim(), text: body, messageId: messageId.trim() || null };
}

/**
 * Mittenti automatici (rimbalzi, risponditori, noreply) e la nostra stessa casella: a questi non si apre
 * un ticket né si risponde, altrimenti due risponditori automatici si scrivono all'infinito.
 */
export function isAutomatedSender(email: string, ownAddresses: string[]): boolean {
  const e = email.toLowerCase();
  if (ownAddresses.some((a) => a.toLowerCase() === e)) return true;
  return /^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounces?)([+.-][^@]*)?@/i.test(e);
}

/** Stato del ticket dopo un messaggio: chi chiede riapre, la nostra risposta mette in attesa, la nota interna non cambia nulla. */
export function statusAfter(current: TicketStatus, kind: "inbound" | "reply" | "note"): TicketStatus {
  if (kind === "inbound") return "open";
  if (kind === "reply") return "waiting";
  return current;
}

/** Elenco di email da variabile d'ambiente (es. ADMIN_EMAILS), separate da virgola o spazi. */
export function parseEmailList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL.test(e));
}
