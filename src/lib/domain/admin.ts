/** Regole pure del Backoffice: chi è amministratore e quanto vale il ricorrente mensile. */

/**
 * Amministratore: ruolo "admin" nel database, oppure email elencata in ADMIN_EMAILS e già confermata
 * (chi si registra con un'email altrui non la conferma, quindi non diventa amministratore).
 */
export function isAdmin(user: { role: string; email: string; emailVerified: boolean }, adminEmails: string[]): boolean {
  if (user.role === "admin") return true;
  return user.emailVerified && adminEmails.includes(user.email.toLowerCase());
}

/** Ricorrente mensile (MRR) degli abbonamenti attivi: l'annuale vale un dodicesimo al mese. */
export function monthlyRecurringCents(subs: { period: "monthly" | "yearly"; monthlyPriceCents: number; yearlyPriceCents: number }[]): number {
  return subs.reduce((sum, s) => sum + (s.period === "yearly" ? Math.round(s.yearlyPriceCents / 12) : s.monthlyPriceCents), 0);
}

/** Accredito manuale di token dal Backoffice: intero, positivo, con un tetto per evitare errori di battitura. */
export const MAX_MANUAL_CREDIT = 1000;

export function manualCreditProblem(amount: number, reason: string): string | null {
  if (!Number.isInteger(amount) || amount < 1) return "Scrivi un numero intero di token, almeno 1";
  if (amount > MAX_MANUAL_CREDIT) return `Al massimo ${MAX_MANUAL_CREDIT} token per volta`;
  if (reason.trim().length < 3) return "Scrivi il motivo: compare nel registro token del partner";
  return null;
}
