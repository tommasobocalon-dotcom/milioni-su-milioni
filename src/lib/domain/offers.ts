/** Pacchetti token e durate dei boost, come nel prototipo Figma (prezzi da confermare: PRD §20). */

export const TOKEN_PACKAGES = [
  { code: "piccolo", name: "Piccolo", tokens: 50, priceCents: 4900 },
  { code: "medio", name: "Medio", tokens: 120, priceCents: 9900, highlight: true },
  { code: "grande", name: "Grande", tokens: 300, priceCents: 21900 },
] as const;

export const BOOST_OPTIONS = [
  { days: 3, tokens: 30 },
  { days: 7, tokens: 60 },
  { days: 14, tokens: 100 },
] as const;

/** Sconto rispetto al pacchetto piccolo, per mostrare il risparmio. */
export function packageSaving(tokens: number, priceCents: number): number {
  const base = TOKEN_PACKAGES[0].priceCents / TOKEN_PACKAGES[0].tokens;
  return Math.round((1 - priceCents / tokens / base) * 100);
}
