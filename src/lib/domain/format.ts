export type PriceUnit = "flat" | "sqm" | "hour" | "visit" | "percent" | "month" | "unit";

export const PRICE_UNIT_LABEL: Record<PriceUnit, string> = {
  flat: "a corpo",
  sqm: "€/m²",
  hour: "€/ora",
  visit: "a intervento",
  percent: "% sul prezzo",
  month: "al mese",
  unit: "a pezzo",
};

const SUFFIX: Partial<Record<PriceUnit, string>> = { sqm: "/m²", hour: "/ora", month: "/mese" };

const nf = (cents: number) =>
  new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: "always",
  }).format(cents / 100);

/** Importo in centesimi → "1.200 €" o "32,50 €". */
export function formatEuro(cents: number): string {
  return `${nf(cents)} €`;
}

/**
 * Fascia di prezzo indicativa del listino. Gli importi sono in centesimi; per le percentuali
 * in punti base (200 = 2 %).
 */
export function formatPriceRange(from: number | null, to: number | null, unit: PriceUnit): string | null {
  if (from === null && to === null) return null;
  if (from === 0 && (to === 0 || to === null)) return "Gratuito";
  if (unit === "percent") {
    const p = (v: number) => nf(v);
    if (from !== null && to !== null && from !== to) return `${p(from)} – ${p(to)} %`;
    return `${p((from ?? to)!)} %`;
  }
  const suffix = SUFFIX[unit] ?? "";
  if (from !== null && to !== null && from !== to) return `${nf(from)} – ${nf(to)} €${suffix}`;
  if (from !== null && to === null) return `da ${nf(from)} €${suffix}`;
  return `${nf((from ?? to)!)} €${suffix}`;
}

export function formatResponseTime(minutes: number | null): string | null {
  if (minutes === null) return null;
  if (minutes < 60) return "meno di 1 ora";
  if (minutes < 60 * 20) return `~${Math.round(minutes / 60)} ${Math.round(minutes / 60) === 1 ? "ora" : "ore"}`;
  const days = Math.round(minutes / (60 * 24));
  return `~${days} ${days === 1 ? "giorno" : "giorni"}`;
}

export function formatDistanceKm(km: number): string {
  return `${km.toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

/** "+393475551218" → "+39 347 555 1218". Numeri non italiani restano come sono. */
export function formatPhone(e164: string): string {
  const m = /^\+39(\d{3})(\d{3})(\d{3,5})$/.exec(e164);
  return m ? `+39 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

/** Pagina a cui tornare dopo l'accesso (?next=): solo percorsi di questo sito, mai un altro dominio. */
export function safeNextPath(raw: string | undefined | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  return raw;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Distanza in linea d'aria (formula dell'emisenoverso), in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Importo scritto da una persona ("1.200,50", "32,5", "90 €") → centesimi (o punti base per le percentuali).
 * Null se il campo è vuoto, NaN se non è un numero valido o è negativo.
 */
export function parseAmount(input: string): number | null {
  let s = input.replace(/[€%\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

/** Centesimi → testo per un campo modulo ("1200", "32,5"); stringa vuota se manca. */
export function amountInput(cents: number | null): string {
  return cents === null ? "" : String(cents / 100).replace(".", ",");
}
