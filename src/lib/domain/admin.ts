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

export type LeadOutcome = "unconfirmed" | "delivered" | "locked" | "duplicate" | "not_delivered" | "refunded";

type Tone = "ok" | "warn" | "bad" | "muted";

export const LEAD_OUTCOMES: Record<LeadOutcome, { label: string; tone: Tone }> = {
  delivered: { label: "Consegnata", tone: "ok" },
  locked: { label: "Senza contatti (gratuito al limite)", tone: "warn" },
  not_delivered: { label: "Non consegnata (azienda non attiva)", tone: "bad" },
  unconfirmed: { label: "Codice non confermato", tone: "muted" },
  duplicate: { label: "Duplicato", tone: "muted" },
  refunded: { label: "Restituita", tone: "muted" },
};

/** Che fine ha fatto una richiesta di contatto (vedi confirmLead in src/lib/leads/service.ts). */
export function leadOutcome(lead: { verifiedAt: Date | null; deliveredAt: Date | null; charge: string; reportStatus: string | null }): { key: LeadOutcome; label: string; tone: Tone } {
  const key: LeadOutcome = !lead.verifiedAt
    ? "unconfirmed"
    : lead.charge === "refunded" || lead.reportStatus === "accepted"
      ? "refunded"
      : lead.charge === "duplicate"
        ? "duplicate"
        : lead.charge === "locked"
          ? "locked"
          : lead.deliveredAt
            ? "delivered"
            : "not_delivered";
  return { key, ...LEAD_OUTCOMES[key] };
}

/** Sponsorizzazione (boost, estensione di zona): "ending" se finisce entro 3 giorni, per avvisare l'azienda. */
export function sponsorshipState({ startsAt, endsAt }: { startsAt: Date; endsAt: Date }, now: Date): "scheduled" | "active" | "ending" | "ended" {
  if (endsAt <= now) return "ended";
  if (startsAt > now) return "scheduled";
  return endsAt.getTime() - now.getTime() <= 3 * 86_400_000 ? "ending" : "active";
}
