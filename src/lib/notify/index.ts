import "server-only";
import { demoMode } from "@/lib/demo-mode";

/**
 * Invio di SMS ed email. In sviluppo (provider "console") i messaggi vengono stampati nel
 * terminale. In produzione si collegheranno Twilio (SMS) e Resend o Postmark (email): il resto
 * dell'app usa solo queste due funzioni.
 */

export async function sendSms(to: string, text: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER ?? "console";
  if (provider === "console") {
    console.log(`\n[sms → ${to}] ${text}\n`);
    return;
  }
  throw new Error(`Provider SMS "${provider}" non ancora configurato`);
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  if (provider === "console") {
    console.log(`\n[email → ${to}] ${subject}\n${text}\n`);
    return;
  }
  if (provider === "resend") return sendWithResend(to, subject, text);
  throw new Error(`Provider email "${provider}" non ancora configurato`);
}

/** Resend (server UE disponibili): una chiamata HTTP, senza librerie. */
async function sendWithResend(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("RESEND_API_KEY o EMAIL_FROM mancanti");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!res.ok) throw new Error(`Invio email non riuscito (${res.status}): ${await res.text()}`);
}

/** In sviluppo e sul sito di prova, con le email stampate in console, mostriamo il link anche a schermo. */
export function showDevLinks(): boolean {
  return demoMode() && (process.env.EMAIL_PROVIDER ?? "console") === "console";
}

/** In sviluppo e sul sito di prova, con i messaggi stampati in console, mostriamo il codice anche a schermo. */
export function showDevCodes(): boolean {
  return demoMode() && (process.env.SMS_PROVIDER ?? "console") === "console";
}
