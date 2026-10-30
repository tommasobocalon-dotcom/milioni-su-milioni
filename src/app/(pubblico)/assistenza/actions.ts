"use server";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/domain/otp";
import { MESSAGE_MAX, TICKET_TOPICS } from "@/lib/domain/support";
import { ipRateLimited } from "@/lib/security/ip-limit";
import { TURNSTILE_ERROR, turnstileOk } from "@/lib/security/turnstile";
import { openTicket } from "@/lib/support/service";

export type SupportField = "name" | "email" | "topic" | "subject" | "message";
export type SupportResult = { ok: true; number: number; email: string } | { ok: false; error: string; field?: SupportField };

const Schema = z.object({
  name: z.string().trim().min(2, "Scrivi nome e cognome").max(80, "Nome troppo lungo"),
  email: z.string().transform(normalizeEmail).pipe(z.email("Controlla l'indirizzo email")),
  topic: z.enum(TICKET_TOPICS.map((t) => t.value), { error: "Scegli l'argomento" }),
  subject: z.string().trim().min(3, "Scrivi l'oggetto in poche parole").max(150, "Oggetto troppo lungo"),
  message: z.string().trim().min(10, "Raccontaci il problema in almeno qualche parola").max(MESSAGE_MAX, "Messaggio troppo lungo"),
});

/**
 * Modulo "Assistenza" del sito: apre un ticket nel gestionale e manda la conferma con il numero.
 * Chi è entrato con il suo account scrive con la sua email (identità verificata).
 */
export async function sendSupportRequest(input: Record<SupportField, string>, turnstileToken?: string): Promise<SupportResult> {
  const user = await getSessionUser();
  const parsed = Schema.safeParse(user ? { ...input, email: user.email } : input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: issue.path[0] as SupportField };
  }
  if (await ipRateLimited("support_request", 10, 60)) return { ok: false, error: "Troppe richieste da questo dispositivo. Riprova tra un'ora o scrivici per email." };
  if (!(await turnstileOk(turnstileToken))) return { ok: false, error: TURNSTILE_ERROR };

  const d = parsed.data;
  const ticket = await openTicket({
    channel: "web",
    subject: d.subject,
    topic: d.topic,
    body: d.message,
    requesterName: d.name,
    requesterEmail: d.email,
    sessionUserId: user?.id ?? null,
  });
  return { ok: true, number: ticket.number, email: d.email };
}
