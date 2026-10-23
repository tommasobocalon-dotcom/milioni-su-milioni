/**
 * Media ponderata bayesiana (PRD §5.6): pochi voti alti non scavalcano profili con molte
 * recensioni solide. `prior.mean` è la media di riferimento (es. della categoria nella zona),
 * `prior.weight` quante recensioni "virtuali" valgono come peso.
 */
export function bayesianScore(
  stats: { average: number; count: number },
  prior: { mean: number; weight: number },
): number {
  const { average, count } = stats;
  return (prior.weight * prior.mean + count * average) / (prior.weight + count);
}

export type StarDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

export function ratingDistribution(ratings: number[]): StarDistribution {
  const out: StarDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of ratings) {
    if (r >= 1 && r <= 5 && Number.isInteger(r)) out[r as 1 | 2 | 3 | 4 | 5]++;
  }
  return out;
}
