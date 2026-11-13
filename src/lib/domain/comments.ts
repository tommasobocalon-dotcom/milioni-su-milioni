/**
 * Commenti sotto i lavori di Ispirazione (13/11/2026): li scrivono clienti e aziende che hanno fatto l'accesso e
 * confermato l'email, per chiedere e dare consigli. Non sono recensioni né voti. Regole senza database, provate
 * in comments.test.ts; lo schema è nelle tabelle `portfolio_comments`, `comment_reports` e `partner_blocks`.
 */

export const COMMENT_MAX = 500;

/** Segnalazioni aperte di persone diverse dopo le quali un commento visibile torna in attesa di approvazione. */
export const REPORT_AUTO_HOLD = 3;

/**
 * - visible: lo vedono tutti.
 * - pending: aspetta l'approvazione dell'azienda (parola dell'elenco, autore limitato, troppe segnalazioni).
 * - hidden: nascosto dall'azienda sotto un suo lavoro.
 * - removed: tolto dalla piattaforma (gestionale).
 */
export type CommentStatus = "visible" | "pending" | "hidden" | "removed";

export const REPORT_REASONS = [
  { value: "spam", label: "Spam o pubblicità" },
  { value: "offensive", label: "Offese o linguaggio volgare" },
  { value: "illegal", label: "Contenuto illegale" },
  { value: "personal_data", label: "Dati personali di qualcuno" },
  { value: "other", label: "Altro" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

/** Testo come viene salvato: spazi doppi tolti, al massimo una riga vuota tra due paragrafi. */
export function cleanComment(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Domini più usati dallo spam; non ci sono .io, .me e .co perché in italiano "io" e "me" capitano dopo un punto.
const LINK = /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:it|com|net|org|eu|info|biz|app|shop|online|site|xyz|ru|cn)\b/i;

/** Errore da mostrare a chi scrive, oppure null se il commento (già passato da cleanComment) va bene. */
export function commentError(body: string): string | null {
  if (!body) return "Scrivi un commento";
  if (body.length > COMMENT_MAX) return `Al massimo ${COMMENT_MAX} caratteri`;
  if (LINK.test(body)) return "Nei commenti non si possono mettere link";
  return null;
}

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s" };

/** Testo ridotto a parole semplici separate da uno spazio, per il confronto con l'elenco. */
function plain(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[013457@$]/g, (c) => LEET[c])
    .replace(/(.)\1{2,}/g, "$1")
    .replace(/[^a-z]+/g, " ")
    .trim()} `;
}

/**
 * Vero se nel testo c'è una parola o frase dell'elenco, come parola intera. Non bada a maiuscole e accenti e
 * riconosce i trucchi più comuni (lettere ripetute, numeri al posto delle lettere).
 */
export function hasHiddenWord(body: string, words: readonly string[]): boolean {
  if (words.length === 0) return false;
  const text = plain(body);
  return words.some((w) => {
    const word = plain(w);
    return word.trim() !== "" && text.includes(word);
  });
}

/** Elenco personale dell'azienda dal campo di testo: una voce per riga o separate da virgola. */
export function parseHiddenWords(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const words = raw
    .split(/[\n,]/)
    .map((w) => w.toLowerCase().replace(/\s+/g, " ").trim())
    .filter((w) => w.length >= 2 && w.length <= 40);
  return [...new Set(words)].slice(0, 100);
}

/** Stato di un commento appena scritto. */
export function initialCommentStatus(c: { body: string; baseWords: readonly string[]; partnerWords: readonly string[]; limited: boolean }): CommentStatus {
  if (c.limited) return "pending";
  return hasHiddenWord(c.body, c.baseWords) || hasHiddenWord(c.body, c.partnerWords) ? "pending" : "visible";
}

/** Tetto di frequenza per account: 5 commenti al minuto, 30 al giorno. */
export function tooManyComments(n: { lastMinute: number; lastDay: number }): boolean {
  return n.lastMinute >= 5 || n.lastDay >= 30;
}

/**
 * Chi vede un commento. `moderator` = chi gestisce l'azienda del lavoro. L'autore vede sempre i suoi, con
 * l'etichetta dello stato: nessun commento viene nascosto di nascosto a chi l'ha scritto.
 */
export function visibleTo(c: { status: CommentStatus; authorId: string; authorBlocked: boolean }, viewer: { userId: string | null; moderator: boolean }): boolean {
  if (viewer.userId !== null && viewer.userId === c.authorId) return true;
  if (c.status === "removed") return false;
  if (viewer.moderator) return true;
  return c.status === "visible" && !c.authorBlocked;
}

/** Nome mostrato accanto al commento: nome e iniziale del cognome, mai l'email. */
export function publicAuthorName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0 || name.includes("@")) return "Utente";
  const first = parts[0][0].toUpperCase() + parts[0].slice(1);
  return parts.length === 1 ? first : `${first} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function commentsLabel(count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  return n === 0 ? "Nessun commento" : n === 1 ? "1 commento" : `${n} commenti`;
}
