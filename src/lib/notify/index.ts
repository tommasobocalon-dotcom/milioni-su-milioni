import "server-only";
import { demoMode } from "@/lib/demo-mode";
import { brevoEmailRequest } from "@/lib/domain/brevo";
import { parseEmailList } from "@/lib/domain/support";
import { logError } from "@/lib/domain/log";
import { scrubText } from "@/lib/domain/sentry";

/**
 * Invio delle email: il resto dell'app usa solo sendEmail (gli SMS sono stati tolti il 14/11/2026).
 * Provider "console" (sviluppo): i messaggi vengono stampati nel terminale.
 * Provider "brevo" (produzione): API di Brevo, chiave in BREVO_API_KEY (guida in DEPLOY.md).
 */

/** L'invio non è riuscito (provider giù, configurazione sbagliata). */
export class DeliveryError extends Error {}

async function brevo(kind: string, request: { url: string; init: RequestInit }) {
  let res: Response;
  try {
    res = await fetch(request.url, { ...request.init, signal: AbortSignal.timeout(10_000) });
  } catch (e) {
    throw new DeliveryError(`Brevo ${kind}: nessuna risposta (${e instanceof Error ? e.message : e})`);
  }
  if (!res.ok) throw new DeliveryError(`Brevo ${kind}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
}

function apiKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new DeliveryError("BREVO_API_KEY non impostata");
  return key;
}

/** `replyTo`: dove arrivano le risposte (es. la casella dell'assistenza, che apre o aggiorna i ticket). */
export async function sendEmail(to: string, subject: string, text: string, options: { replyTo?: string } = {}): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  if (provider === "console") {
    const replyTo = options.replyTo ? ` (rispondi a ${options.replyTo})` : "";
    console.log(`\n[email → ${to}]${replyTo} ${subject}\n${text}\n`);
    return;
  }
  if (provider === "resend") return sendWithResend(to, subject, text, options.replyTo);
  if (provider === "brevo") {
    const from = process.env.EMAIL_FROM || "info@gecoitalia.it";
    return brevo("email", brevoEmailRequest({ apiKey: apiKey(), from, fromName: "GecoItalia", to, subject, text, replyTo: options.replyTo }));
  }
  throw new DeliveryError(`Provider email "${provider}" sconosciuto`);
}

/** Resend (server UE disponibili): una chiamata HTTP, senza librerie. */
async function sendWithResend(to: string, subject: string, text: string, replyTo?: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("RESEND_API_KEY o EMAIL_FROM mancanti");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Invio email non riuscito (${res.status}): ${await res.text()}`);
}

const ALERT_EVERY_MS = 10 * 60_000;
const lastAlert = new Map<string, number>();

/**
 * Allarme al team (webhook Stripe fallito, pagamento non riuscito, codice non inviato ai clienti): email a ALERT_EMAILS,
 * altrimenti ad ADMIN_EMAILS, altrimenti a info@gecoitalia.it. Lo stesso oggetto parte al massimo ogni 10 minuti e
 * l'allarme non blocca mai chi lo chiama. Resta anche nei log di Vercel.
 */
// ponytail: limite per istanza e invio con lo stesso Brevo; se Brevo è giù l'avviso resta solo nei log. Sentry quando serve.
export async function alertTeam(subject: string, details: string): Promise<void> {
  // Nel log del server senza email e dati dei moduli; l'email al team ha il testo completo.
  console.error(`[allarme] ${subject}\n${scrubText(details)}`);
  const now = Date.now();
  if (now - (lastAlert.get(subject) ?? -Infinity) < ALERT_EVERY_MS) return;
  lastAlert.set(subject, now);
  const list = parseEmailList(process.env.ALERT_EMAILS);
  const to = list.length ? list : parseEmailList(process.env.ADMIN_EMAILS);
  const results = await Promise.allSettled((to.length ? to : ["info@gecoitalia.it"]).map((r) => sendEmail(r, `[GecoItalia] ${subject}`, details)));
  for (const r of results) if (r.status === "rejected") logError("[allarme] email non inviata:", r.reason);
}

/** In sviluppo e sul sito di prova, con le email stampate in console, mostriamo il link anche a schermo. */
export function showDevLinks(): boolean {
  return demoMode() && (process.env.EMAIL_PROVIDER ?? "console") === "console";
}

/** In sviluppo e sul sito di prova, con le email stampate in console, mostriamo anche a schermo il codice della richiesta. */
export function showDevCodes(): boolean {
  return demoMode() && (process.env.EMAIL_PROVIDER ?? "console") === "console";
}
