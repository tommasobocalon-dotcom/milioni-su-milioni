/** Pacchetti in euro, IVA esclusa (soci, 10-11/11/2026): due boost separati, logo in Home e boost nella ricerca. */
export const BOOST_PLACEMENTS = {
  search: "Sponsorizzato nella ricerca",
  home: "Logo in evidenza in Home",
} as const;
export type BoostPlacement = keyof typeof BOOST_PLACEMENTS;
export const isBoostPlacement = (v: unknown): v is BoostPlacement => typeof v === "string" && Object.hasOwn(BOOST_PLACEMENTS, v);

/** "24 ore", "48 ore"… */
export const boostLabel = (hours: number) => `${hours} ore`;

/**
 * Logo in evidenza in Home a pacchetti in euro, senza token (decisione dei soci, 10/11/2026). Prezzi IVA esclusa.
 * Per i primi 6 mesi dal lancio del sito vale il prezzo promo.
 */
export const HOME_SPONSOR_PACKAGES = [
  { code: "home-7", days: 7, priceCents: 7900, promoCents: 3900 },
  { code: "home-30", days: 30, priceCents: 24900, promoCents: 9900 },
] as const;
export type HomeSponsorPackage = (typeof HOME_SPONSOR_PACKAGES)[number];

export const PROMO_MONTHS = 6;

/** Data di lancio del sito (variabile LANCIO_SITO, "AAAA-MM-GG"); null finché non è fissata. */
export function launchDate(value = process.env.LANCIO_SITO): Date | null {
  const d = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

/** Promo attiva nei primi 6 mesi dal lancio; prima del lancio (data non fissata) è attiva. */
export function promoActive(now: Date, launch: Date | null): boolean {
  if (!launch) return true;
  const end = new Date(launch);
  end.setUTCMonth(end.getUTCMonth() + PROMO_MONTHS);
  return now.getTime() < end.getTime();
}

/** Prezzo da pagare adesso, con quello di listino per mostrarlo barrato durante la promo. */
export function homeSponsorPrice(pkg: HomeSponsorPackage, now: Date, launch: Date | null) {
  const promo = promoActive(now, launch);
  return { cents: promo ? pkg.promoCents : pkg.priceCents, listCents: pkg.priceCents, promo };
}

/** Estensione territoriale: la scheda compare nelle ricerche di un altro comune del Veneto. Prezzo per comune, IVA esclusa. */
export const AREA_EXTENSION_OFFER = { days: 30, priceCents: 4900 } as const;

/** Comuni per pagamento: i codici viaggiano nei metadati di Stripe (massimo 500 caratteri). */
export const MAX_EXTENSION_MUNICIPALITIES = 40;

export const areaExtensionTotal = (count: number) => count * AREA_EXTENSION_OFFER.priceCents;

/** Codici ISTAT scelti dall'azienda: interi positivi senza doppioni, da 1 a MAX_EXTENSION_MUNICIPALITIES; altrimenti null. */
export function municipalityIdsFrom(values: unknown): number[] | null {
  if (!Array.isArray(values)) return null;
  const ids = [...new Set(values.map((v) => (typeof v === "number" || (typeof v === "string" && /^\d+$/.test(v)) ? Number(v) : NaN)))];
  if (ids.length === 0 || ids.length > MAX_EXTENSION_MUNICIPALITIES) return null;
  return ids.every((id) => Number.isInteger(id) && id > 0) ? ids : null;
}

/**
 * Boost "Sponsorizzato nella ricerca" a pacchetti in euro, senza token (decisione dei soci, 10/11/2026). Prezzi IVA esclusa.
 * Stessa classifica di prima (ranking.ts): Premium nel riquadro grande a rotazione, Normal tra i primi con la scheda verde.
 */
export const SEARCH_BOOST_PACKAGES = [
  { code: "search-24", hours: 24, priceCents: 1500 },
  { code: "search-48", hours: 48, priceCents: 2500 },
] as const;

/**
 * Promo dei piani (soci, 11/11/2026). Prezzi IVA esclusa; listino nella tabella plans (Normal 89 €/mese o 828 €/anno,
 * Premium 199 €/mese o 1908 €/anno). Il primo mese del mensile costa sempre 39 € o 79 €; l'annuale costa 599 € o
 * 1490 € (Premium con 30 giorni di logo in Home in regalo) solo per chi si abbona nei primi 6 mesi dal lancio.
 * Lo sconto vale per il primo pagamento: dal secondo mese, o al rinnovo dell'annuale, si paga il listino.
 */
const PLAN_PROMOS: Record<string, { firstMonthCents: number; yearlyCents: number; yearlyGiftHomeDays: number }> = {
  normal: { firstMonthCents: 3900, yearlyCents: 59900, yearlyGiftHomeDays: 0 },
  premium: { firstMonthCents: 7900, yearlyCents: 149000, yearlyGiftHomeDays: 30 },
};

export type PlanPromo = { payNowCents: number; listCents: number; giftHomeDays: number };

/**
 * Promo sul primo pagamento del piano, o null se si paga il listino. `guaranteed`: l'azienda è partita dal piano
 * gratuito di lancio, e la promo dell'annuale le resta anche dopo i 6 mesi (soci, 15/11/2026).
 */
export function planPromo(
  plan: { code: string; monthlyPriceCents: number; yearlyPriceCents: number },
  period: "monthly" | "yearly",
  now: Date,
  launch: Date | null,
  opts: { guaranteed?: boolean } = {},
): PlanPromo | null {
  const promo = Object.hasOwn(PLAN_PROMOS, plan.code) ? PLAN_PROMOS[plan.code] : null;
  if (!promo) return null;
  const listCents = period === "yearly" ? plan.yearlyPriceCents : plan.monthlyPriceCents;
  const payNowCents = period === "yearly" ? promo.yearlyCents : promo.firstMonthCents;
  if (period === "yearly" && !opts.guaranteed && !promoActive(now, launch)) return null;
  if (payNowCents >= listCents) return null;
  return { payNowCents, listCents, giftHomeDays: period === "yearly" ? promo.yearlyGiftHomeDays : 0 };
}

/**
 * Promo per chi cambia piano (12/11/2026): la stessa del primo abbonamento, salendo o scendendo, ma una volta per
 * azienda, altrimenti si potrebbe cambiare avanti e indietro per riaverla.
 */
export function changePromo(promo: PlanPromo | null, alreadyUsed: boolean): PlanPromo | null {
  return alreadyUsed ? null : promo;
}
