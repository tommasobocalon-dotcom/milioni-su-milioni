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
