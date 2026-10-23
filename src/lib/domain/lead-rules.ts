/**
 * Regole sui lead (PRD §7.4). Funzioni pure: nessun accesso al database o all'orologio,
 * il chiamante passa sempre `now`.
 */

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Ore entro cui il partner può segnalare un lead non valido. */
export const REPORT_WINDOW_HOURS = 72;
/** Ore entro cui il partner può sbloccare con i token un lead arrivato oltre quota. */
export const UNLOCK_WINDOW_HOURS = 48;
/** Stesso cliente, partner e servizio entro questi giorni = duplicato annullato in automatico. */
export const DUPLICATE_WINDOW_DAYS = 30;
/** Costo in token di un lead oltre quota (proposta, da confermare: PRD §20 punto 4–5). */
export const TOKEN_COST_PER_LEAD = 8;

export type LeadChargeDecision =
  | { kind: "quota" }
  | { kind: "token"; tokens: number }
  | { kind: "locked"; tokens: number; unlockExpiresAt: Date }
  | { kind: "duplicate" }
  | { kind: "redirect" };

export function decideLeadCharge(input: {
  accountActive: boolean;
  isDuplicate: boolean;
  quotaUsed: number;
  quotaIncluded: number;
  tokenBalance: number;
  autoUseTokens: boolean;
  tokenCostPerLead: number;
  now: Date;
}): LeadChargeDecision {
  if (input.isDuplicate) return { kind: "duplicate" };
  // Account sospeso o non attivo: il cliente non resta senza risposta, gli proponiamo alternative.
  if (!input.accountActive) return { kind: "redirect" };
  if (input.quotaUsed < input.quotaIncluded) return { kind: "quota" };
  if (input.autoUseTokens && input.tokenBalance >= input.tokenCostPerLead) {
    return { kind: "token", tokens: input.tokenCostPerLead };
  }
  return {
    kind: "locked",
    tokens: input.tokenCostPerLead,
    unlockExpiresAt: new Date(input.now.getTime() + UNLOCK_WINDOW_HOURS * HOUR),
  };
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
