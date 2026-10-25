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
  throw new Error(`Provider email "${provider}" non ancora configurato`);
}

/** In sviluppo e sul sito di prova, con i messaggi stampati in console, mostriamo il codice anche a schermo. */
export function showDevCodes(): boolean {
  return demoMode() && (process.env.SMS_PROVIDER ?? "console") === "console";
}
