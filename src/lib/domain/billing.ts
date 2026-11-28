/**
 * Regole di fatturazione (PRD §7.2, §7.3) indipendenti da Stripe e dal database: il webhook le usa
 * per tradurre lo stato di Stripe nello stato di abbonamento e scheda del partner.
 */
import { HOME_SPONSOR_PACKAGES, provinceIdsFrom, SEARCH_BOOST_PACKAGES } from "./offers";

/** Giorni di prova gratuita al primo abbonamento (documento del 4/11/2026). */
export const TRIAL_DAYS = 7;

export type SubscriptionStatus = "activating" | "active" | "suspended" | "cancelled";

/** Sospensione immediata al pagamento fallito: nessun periodo di tolleranza (decisione del 26/10/2026). */
export function subscriptionStatusFromStripe(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "incomplete":
      return "activating";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    default:
      // past_due, unpaid, paused e stati futuri: meglio sospeso che attivo senza pagamento.
      return "suspended";
  }
}

const PRIORITY: SubscriptionStatus[] = ["active", "suspended", "activating", "cancelled"];

/** Stato della scheda dato lo stato di tutti gli abbonamenti del partner. */
export function accountStatusFrom(statuses: SubscriptionStatus[]): SubscriptionStatus {
  if (statuses.length === 0) return "activating";
  return PRIORITY.find((s) => statuses.includes(s))!;
}

export type VerificationStatus = "pending" | "verified" | "rejected";

/**
 * Stato della scheda pubblica: online ("active") solo con un piano attivo **e** i dati dell'azienda controllati dal team
 * (partita IVA e sede, decisione del 20/11/2026). Prima chiunque poteva registrare la partita IVA di un'altra azienda e,
 * col piano gratuito, andare online a suo nome. Con il piano attivo ma senza verifica resta "activating", nascosta.
 * Una sospensione del team (`partners.suspended_by_team`, 27/11/2026) vince su tutto: la toglie solo "Riattiva".
 */
export function listingStatus(fromPlans: SubscriptionStatus, verification: VerificationStatus, suspendedByTeam = false): SubscriptionStatus {
  if (suspendedByTeam) return "suspended";
  return fromPlans === "active" && verification !== "verified" ? "activating" : fromPlans;
}

/** Motivi della disdetta, facoltativi: finiscono nel registro e nell'avviso al team, per capire perché le aziende se ne vanno. */
export const CANCEL_REASONS = [
  { value: "price", label: "Costa troppo" },
  { value: "few_leads", label: "Ricevo poche richieste" },
  { value: "bad_leads", label: "Le richieste non sono adatte al mio lavoro" },
  { value: "busy", label: "Ho già abbastanza lavoro" },
  { value: "closing", label: "Chiudo o cambio attività" },
  { value: "other", label: "Altro" },
] as const;

/**
 * Data in cui l'abbonamento si chiude per una disdetta già fatta, o null. Disdetta dall'Area aziende o dal portale
 * (cancel_at_period_end): resta attivo fino alla fine del periodo pagato, poi Stripe lo chiude (customer.subscription.deleted)
 * e la scheda esce dal sito. Una data scelta a mano in Stripe (cancel_at) vale quella.
 */
export function cancellationDate(sub: { cancel_at_period_end: boolean; cancel_at: number | null }, periodEnd: Date): Date | null {
  if (sub.cancel_at) return new Date(sub.cancel_at * 1000);
  return sub.cancel_at_period_end ? periodEnd : null;
}

/** Periodo corrente dalle voci dell'abbonamento (Stripe lo tiene sulle voci, in secondi Unix). */
export function periodFromItems(items: { current_period_start: number; current_period_end: number }[]): { start: Date; end: Date } {
  if (items.length === 0) throw new Error("Abbonamento Stripe senza voci");
  const start = Math.min(...items.map((i) => i.current_period_start));
  const end = Math.max(...items.map((i) => i.current_period_end));
  return { start: new Date(start * 1000), end: new Date(end * 1000) };
}

type CheckoutLike = { mode: string; payment_status: string; metadata: Record<string, string> | null };

/** Sponsorizzazione in Home pagata (Checkout "home_sponsor"): partner e giorni di logo in evidenza. */
export function homeSponsorFromCheckout(session: CheckoutLike): { partnerId: string; days: number } | null {
  const m = session.metadata;
  if (session.mode !== "payment" || session.payment_status !== "paid" || m?.kind !== "home_sponsor" || !m.partnerId) return null;
  const pkg = HOME_SPONSOR_PACKAGES.find((p) => p.code === m.packageCode);
  return pkg ? { partnerId: m.partnerId, days: pkg.days } : null;
}

/** Estensione territoriale pagata (Checkout "area_extension"): partner e codici ISTAT delle province. */
export function areaExtensionFromCheckout(session: CheckoutLike): { partnerId: string; provinceIds: number[] } | null {
  const m = session.metadata;
  if (session.mode !== "payment" || session.payment_status !== "paid" || m?.kind !== "area_extension" || !m.partnerId) return null;
  const provinceIds = provinceIdsFrom(m.provinceIds ? m.provinceIds.split(",") : []);
  return provinceIds ? { partnerId: m.partnerId, provinceIds } : null;
}

/** Boost nella ricerca pagato (Checkout "search_boost"): partner e ore di sponsorizzazione. */
export function searchBoostFromCheckout(session: CheckoutLike): { partnerId: string; hours: number } | null {
  const m = session.metadata;
  if (session.mode !== "payment" || session.payment_status !== "paid" || m?.kind !== "search_boost" || !m.partnerId) return null;
  const pkg = SEARCH_BOOST_PACKAGES.find((p) => p.code === m.packageCode);
  return pkg ? { partnerId: m.partnerId, hours: pkg.hours } : null;
}

/** I prezzi dei piani in Stripe si riconoscono dalla lookup_key: niente id da copiare nel database o su Vercel. */
export function planLookupKey(code: string, period: "monthly" | "yearly"): string {
  return `geco_${code}_${period}`;
}

export function planFromLookupKey(key: string | null | undefined): { code: string; period: "monthly" | "yearly" } | null {
  const m = key?.match(/^geco_([a-z0-9-]+)_(monthly|yearly)$/);
  return m ? { code: m[1], period: m[2] as "monthly" | "yearly" } : null;
}
