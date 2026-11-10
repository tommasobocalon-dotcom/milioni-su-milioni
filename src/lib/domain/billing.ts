/**
 * Regole di fatturazione (PRD §7.2, §7.3) indipendenti da Stripe e dal database: il webhook le usa
 * per tradurre lo stato di Stripe nello stato di abbonamento e scheda del partner.
 */
import { HOME_SPONSOR_PACKAGES, municipalityIdsFrom, SEARCH_BOOST_PACKAGES, TOKEN_PACKAGES } from "./offers";

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

/** Periodo corrente dalle voci dell'abbonamento (Stripe lo tiene sulle voci, in secondi Unix). */
export function periodFromItems(items: { current_period_start: number; current_period_end: number }[]): { start: Date; end: Date } {
  if (items.length === 0) throw new Error("Abbonamento Stripe senza voci");
  const start = Math.min(...items.map((i) => i.current_period_start));
  const end = Math.max(...items.map((i) => i.current_period_end));
  return { start: new Date(start * 1000), end: new Date(end * 1000) };
}

type CheckoutLike = { mode: string; payment_status: string; metadata: Record<string, string> | null };

/** Pacchetto token da accreditare per un Checkout pagato; null se non c'è niente da accreditare (ancora). */
export function tokenPurchaseFromCheckout(session: CheckoutLike): { partnerId: string; tokens: number; name: string } | null {
  const m = session.metadata;
  if (session.mode !== "payment" || session.payment_status !== "paid" || m?.kind !== "tokens" || !m.partnerId) return null;
  const pkg = TOKEN_PACKAGES.find((p) => p.code === m.packageCode);
  return pkg ? { partnerId: m.partnerId, tokens: pkg.tokens, name: pkg.name } : null;
}

/** Sponsorizzazione in Home pagata (Checkout "home_sponsor"): partner e giorni di logo in evidenza. */
export function homeSponsorFromCheckout(session: CheckoutLike): { partnerId: string; days: number } | null {
  const m = session.metadata;
  if (session.mode !== "payment" || session.payment_status !== "paid" || m?.kind !== "home_sponsor" || !m.partnerId) return null;
  const pkg = HOME_SPONSOR_PACKAGES.find((p) => p.code === m.packageCode);
  return pkg ? { partnerId: m.partnerId, days: pkg.days } : null;
}

/** Estensione territoriale pagata (Checkout "area_extension"): partner e codici ISTAT dei comuni. */
export function areaExtensionFromCheckout(session: CheckoutLike): { partnerId: string; municipalityIds: number[] } | null {
  const m = session.metadata;
  if (session.mode !== "payment" || session.payment_status !== "paid" || m?.kind !== "area_extension" || !m.partnerId) return null;
  const municipalityIds = municipalityIdsFrom(m.municipalityIds ? m.municipalityIds.split(",") : []);
  return municipalityIds ? { partnerId: m.partnerId, municipalityIds } : null;
}

/** Boost nella ricerca pagato (Checkout "search_boost"): partner e ore di sponsorizzazione. */
export function searchBoostFromCheckout(session: CheckoutLike): { partnerId: string; hours: number } | null {
  const m = session.metadata;
  if (session.mode !== "payment" || session.payment_status !== "paid" || m?.kind !== "search_boost" || !m.partnerId) return null;
  const pkg = SEARCH_BOOST_PACKAGES.find((p) => p.code === m.packageCode);
  return pkg ? { partnerId: m.partnerId, hours: pkg.hours } : null;
}

/** Token del piano: a ogni periodo pagato (primo compreso), non sui conguagli. */
export function grantsRenewalTokens(billingReason: string | null): boolean {
  return billingReason === "subscription_create" || billingReason === "subscription_cycle";
}

/**
 * Token del piano "ogni mese" (documento del 4/11/2026): quante quote mensili spettano dall'inizio del
 * periodo pagato fino a `now`, prima compresa. Con il mensile è sempre 1; con l'annuale ne arriva una a ogni
 * mese compiuto, al massimo 12. Il 31 gennaio + 1 mese = 28 febbraio (fine mese).
 */
export function tokenMonthsDue(periodStart: Date, now: Date): number {
  let months = 0;
  while (months < 12 && addMonths(periodStart, months).getTime() <= now.getTime()) months++;
  return Math.max(months, 1);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

/** I prezzi dei piani in Stripe si riconoscono dalla lookup_key: niente id da copiare nel database o su Vercel. */
export function planLookupKey(code: string, period: "monthly" | "yearly"): string {
  return `geco_${code}_${period}`;
}

export function planFromLookupKey(key: string | null | undefined): { code: string; period: "monthly" | "yearly" } | null {
  const m = key?.match(/^geco_([a-z0-9-]+)_(monthly|yearly)$/);
  return m ? { code: m[1], period: m[2] as "monthly" | "yearly" } : null;
}
