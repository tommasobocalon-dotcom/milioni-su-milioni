/**
 * Confronto prezzi (pagina /confronta-prezzi): riassunti dei prezzi indicativi dei listini partner e del
 * prezzo al metro quadro degli immobili pubblicati dalle agenzie. Importi in centesimi.
 */

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export type PriceSummary = { min: number; median: number; max: number; count: number };

/**
 * Fasce di prezzo pubblicate per uno stesso servizio: il prezzo di partenza più basso, quello tipico (mediana
 * dei prezzi di partenza) e il più alto della fascia. Chi pubblica un solo estremo vale per entrambi.
 */
export function priceSummary(rows: { from: number | null; to: number | null }[]): PriceSummary | null {
  const ranges = rows.flatMap(({ from, to }) => (from === null && to === null ? [] : [[from ?? to!, to ?? from!] as const]));
  if (ranges.length === 0) return null;
  const lows = ranges.map(([low]) => low);
  return {
    min: Math.min(...lows),
    median: median(lows),
    max: Math.max(...ranges.map(([, high]) => high)),
    count: ranges.length,
  };
}

/** Posizione (0–1) di un importo sulla scala del grafico, da min a max. */
export function scalePosition(value: number, min: number, max: number): number {
  if (max <= min) return 1;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

const toEuro = (cents: number) => Math.round(cents / 100) * 100;

export type SqmSummary = { average: number; min: number; max: number; count: number };

/** Prezzo al metro quadro degli immobili (media, minimo, massimo), arrotondato all'euro. */
export function pricePerSqm(items: { priceCents: number | null; sqm: number | null }[]): SqmSummary | null {
  const perSqm = items.flatMap(({ priceCents, sqm }) => (priceCents && priceCents > 0 && sqm && sqm > 0 ? [priceCents / sqm] : []));
  if (perSqm.length === 0) return null;
  return {
    average: toEuro(perSqm.reduce((sum, v) => sum + v, 0) / perSqm.length),
    min: toEuro(Math.min(...perSqm)),
    max: toEuro(Math.max(...perSqm)),
    count: perSqm.length,
  };
}
