/**
 * Consenso ai cookie di misurazione delle pubblicità (Google Ads, pixel di Meta), regole del Garante (linee guida
 * cookie, 10/6/2021): senza una scelta esplicita nessun cookie di terze parti; "Rifiuta" pesa quanto "Accetta"; la
 * scelta vale 6 mesi, poi si chiede di nuovo. Il cookie dura 6 mesi; cambiando la versione si richiede a tutti.
 */

export const CONSENT_COOKIE = "geco_consenso";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
const VERSION = "v1";

export type Consent = { marketing: boolean };
export type Conversion = "lead" | "signup" | "purchase";

export type TrackingConfig = {
  /** Es. "AW-123456789" (Google Ads → Obiettivi → Conversioni). */
  googleAdsId: string;
  /** Etichetta di ogni conversione creata in Google Ads (la parte dopo "/" in send_to). */
  googleLabels: Partial<Record<Conversion, string>>;
  metaPixelId: string;
};

export function serializeConsent(marketing: boolean): string {
  return `${VERSION}:${marketing ? 1 : 0}`;
}

export function parseConsent(value: string | undefined): Consent | null {
  const m = /^v1:([01])$/.exec(value ?? "");
  return m ? { marketing: m[1] === "1" } : null;
}

/** Con nessuno dei due strumenti configurato non c'è niente da chiedere: il banner non compare. */
export function trackingEnabled(c: TrackingConfig): boolean {
  return Boolean(c.googleAdsId || c.metaPixelId);
}

const META_EVENT: Record<Conversion, [string, ...unknown[]]> = {
  lead: ["track", "Lead"],
  signup: ["track", "CompleteRegistration"],
  // ponytail: valore 0, l'importo non arriva al browser; passarlo dal ritorno di Stripe se Meta deve ottimizzare sul fatturato.
  purchase: ["track", "Purchase", { currency: "EUR", value: 0 }],
};

/** Chiamate a gtag (Google) e fbq (Meta) per una conversione; solo gli strumenti configurati. */
export function conversionCalls(event: Conversion, c: TrackingConfig): { to: "google" | "meta"; args: unknown[] }[] {
  const calls: { to: "google" | "meta"; args: unknown[] }[] = [];
  const label = c.googleLabels[event];
  if (c.googleAdsId && label) calls.push({ to: "google", args: ["event", "conversion", { send_to: `${c.googleAdsId}/${label}` }] });
  if (c.metaPixelId) calls.push({ to: "meta", args: META_EVENT[event] });
  return calls;
}
