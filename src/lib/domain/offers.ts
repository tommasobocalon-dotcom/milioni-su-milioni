/** Pacchetti token e boost (documento "Costo e funzioni definitive", 4/11/2026). Prezzi IVA esclusa, aggiornati il 5/11/2026. */

export const TOKEN_PACKAGES = [
  { code: "starter", name: "Starter", tokens: 100, priceCents: 1899 },
  { code: "pro", name: "Pro", tokens: 300, priceCents: 4899, highlight: true },
  { code: "business", name: "Business", tokens: 750, priceCents: 9899 },
] as const;

/** Boost temporaneo ("Flash Sponsor"), solo per i piani Normal e Premium (ranking.ts, canBoost). */
export const BOOST_OPTIONS = [
  { hours: 24, tokens: 50 },
  { hours: 48, tokens: 90 },
  { hours: 72, tokens: 140 },
] as const;

/** "24 ore", "48 ore"… */
export const boostLabel = (hours: number) => `${hours} ore`;

/** Sconto rispetto al pacchetto più piccolo, per mostrare il risparmio. */
export function packageSaving(tokens: number, priceCents: number): number {
  const base = TOKEN_PACKAGES[0].priceCents / TOKEN_PACKAGES[0].tokens;
  return Math.round((1 - priceCents / tokens / base) * 100);
}

/** Espansione "spot" a una provincia vicina (solo Normal e Premium). */
export const AREA_EXTENSION = { days: 30, tokens: 180 } as const;

/** Lavoro in evidenza nella pagina "Ispirazione / Case study" (solo Normal e Premium). */
export const SHOWCASE_OPTIONS = [
  { days: 7, tokens: 80 },
  { days: 30, tokens: 250 },
] as const;
