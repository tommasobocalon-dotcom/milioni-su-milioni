/**
 * Regole sui lead (PRD §7.4). Funzioni pure: nessun accesso al database o all'orologio,
 * il chiamante passa sempre `now`.
 */

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Ore entro cui il partner può segnalare un lead non valido. */
export const REPORT_WINDOW_HOURS = 72;
/** Stesso cliente, partner e servizio entro questi giorni = duplicato annullato in automatico. */
export const DUPLICATE_WINDOW_DAYS = 30;

/**
 * Le richieste dei clienti sono gratis e illimitate per tutti i piani (decisione del 4/11/2026):
 * niente quota, niente richieste extra da sbloccare. "quota" resta il nome della consegna normale nel database.
 * Eccezione: il piano gratuito (free-plan.ts), che dopo 3 richieste nel mese le consegna "locked", senza contatti.
 */
export type LeadChargeDecision = { kind: "quota" } | { kind: "duplicate" } | { kind: "redirect" } | { kind: "locked" };

export function decideLeadCharge(input: { accountActive: boolean; isDuplicate: boolean; freeLeadsLeft?: number | null }): LeadChargeDecision {
  if (input.isDuplicate) return { kind: "duplicate" };
  // Account sospeso o non attivo: il cliente non resta senza risposta, gli proponiamo alternative.
  if (!input.accountActive) return { kind: "redirect" };
  if (input.freeLeadsLeft != null && input.freeLeadsLeft <= 0) return { kind: "locked" };
  return { kind: "quota" };
}

export type LeadFingerprint = {
  partnerId: string;
  /** Servizio richiesto, o la categoria quando il servizio non è indicato. */
  serviceKey: string;
  clientPhone: string;
  clientEmail: string;
  createdAt: Date;
};

export function isDuplicateLead(previous: LeadFingerprint[], candidate: LeadFingerprint): boolean {
  const email = candidate.clientEmail.trim().toLowerCase();
  return previous.some((p) => {
    if (p.partnerId !== candidate.partnerId || p.serviceKey !== candidate.serviceKey) return false;
    const age = candidate.createdAt.getTime() - p.createdAt.getTime();
    if (age < 0 || age > DUPLICATE_WINDOW_DAYS * DAY) return false;
    return p.clientPhone === candidate.clientPhone || p.clientEmail.trim().toLowerCase() === email;
  });
}

export function canReportLead(deliveredAt: Date | null, now: Date): boolean {
  if (!deliveredAt) return false;
  return now.getTime() - deliveredAt.getTime() <= REPORT_WINDOW_HOURS * HOUR;
}

/** Motivi oggettivi ammessi per la segnalazione (PRD §7.4 punto 3). */
export const REPORT_REASONS = [
  { value: "unreachable", label: "Numero inesistente o irraggiungibile" },
  { value: "out_of_area", label: "Fuori dalle zone che servo" },
  { value: "out_of_service", label: "Servizio che non offro" },
  { value: "spam", label: "Spam evidente" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
