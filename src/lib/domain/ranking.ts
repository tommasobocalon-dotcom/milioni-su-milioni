import { bayesianScore } from "./rating";

/**
 * Punteggio dei risultati organici (PRD §7.5): pertinenza di zona, valutazione ponderata,
 * completezza della scheda, tempo di risposta e peso del piano. I posti sponsorizzati sono
 * separati e non passano da qui. I pesi andranno resi configurabili dal backoffice.
 */
export const RANKING_WEIGHTS = {
  rating: 0.38,
  completeness: 0.17,
  response: 0.15,
  plan: 0.15,
  proximity: 0.15,
};

export const RATING_PRIOR = { mean: 4.2, weight: 10 };

export function organicScore(input: {
  rating: { average: number; count: number };
  completeness: number;
  responseMinutes: number | null;
  /** 1 Base, 2 Media, 3 Professional. */
  planWeight: number;
  distanceKm: number | null;
}): number {
  const w = RANKING_WEIGHTS;
  const rating = (bayesianScore(input.rating, RATING_PRIOR) - 1) / 4;
  const completeness = Math.min(100, Math.max(0, input.completeness)) / 100;
  const response =
    input.responseMinutes === null ? 0.3 : 1 - Math.min(Math.max(input.responseMinutes - 60, 0), 47 * 60) / (47 * 60);
  const plan = Math.min(Math.max(input.planWeight, 0), 3) / 3;
  const proximity = input.distanceKm === null ? 0.5 : 1 - Math.min(input.distanceKm, 30) / 30;
  return (
    w.rating * rating + w.completeness * completeness + w.response * response + w.plan * plan + w.proximity * proximity
  );
}
