/**
 * Ordine dei risultati di Trova professionista / Trova agenzia (decisione del cliente, 4/11/2026),
 * applicato dopo il filtro per categoria e zona servita:
 * Premium con boost, Premium, Normal con boost, Normal, Base. Dentro lo stesso gruppo l'ordine
 * ruota: ogni visitatore ha il suo (stesso ordine per tutta la visita, diverso da un visitatore all'altro).
 * In cima un riquadro grande per un Premium con boost, o per un Premium se nessuno ha il boost.
 * Va dichiarato sul sito (P2B, Omnibus): pagina "Come funziona".
 */

/** Cookie di sessione con un id casuale del visitatore: decide l'ordine tra pari grado (niente profilazione). */
export const VISITOR_COOKIE = "geco_visita";

/** Media a priori per l'ordinamento "per valutazione" (media bayesiana, rating.ts). */
export const RATING_PRIOR = { mean: 4.2, weight: 10 };

/** Peso del piano (colonna plans.visibility_weight): 1 Base, 2 Normal, 3 Premium. */
export const PREMIUM_WEIGHT = 3;

/** Il Base non può comprare il boost. */
export function canBoost(planWeight: number): boolean {
  return planWeight >= 2;
}

/** Gruppo in classifica: più alto = più in alto. */
export function listingTier(planWeight: number, boosted: boolean): number {
  return Math.max(planWeight - 1, 0) * 2 + (boosted && canBoost(planWeight) ? 1 : 0);
}

/** FNV-1a: numero stabile per (visitatore, partner), per mescolare senza stato. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export function rankListing<T extends { id: string; planWeight: number; boosted: boolean }>(
  items: T[],
  visitorSeed: string,
): { featured: T | null; results: T[] } {
  const tier = (i: T) => listingTier(i.planWeight, i.boosted);
  const sorted = [...items].sort((a, b) => tier(b) - tier(a) || hash(visitorSeed + a.id) - hash(visitorSeed + b.id));
  const featured = sorted[0] && sorted[0].planWeight >= PREMIUM_WEIGHT ? sorted[0] : null;
  return { featured, results: featured ? sorted.slice(1) : sorted };
}
