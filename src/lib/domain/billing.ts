/**
 * Regole di fatturazione (PRD §7.2, §7.3) indipendenti da Stripe e dal database: il webhook le usa
 * per tradurre lo stato di Stripe nello stato di abbonamento e scheda del partner.
 */
import { TOKEN_PACKAGES } from "./offers";

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

/** Token omaggio del piano: a ogni periodo pagato (primo compreso), non sui conguagli. */
export function grantsRenewalTokens(billingReason: string | null): boolean {
  return billingReason === "subscription_create" || billingReason === "subscription_cycle";
}
