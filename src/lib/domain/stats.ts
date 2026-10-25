/** Calcoli puri per le statistiche dell'Area Partner (giorni in ora italiana). */

export const STATS_PERIODS = [7, 30, 90] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

/** Periodo dal parametro `?periodo=`; 30 giorni se manca o non è ammesso. */
export function parsePeriod(raw: string | string[] | undefined): StatsPeriod {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return (STATS_PERIODS as readonly number[]).includes(n) ? (n as StatsPeriod) : 30;
}

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" });

/** Giorno di calendario a Roma, "AAAA-MM-GG". */
export const romeDay = (d: Date) => dayFmt.format(d);

/** Gli ultimi `days` giorni fino a quello di `now` compreso, dal più vecchio. */
export function dayKeys(now: Date, days: number): string[] {
  // Si parte da mezzogiorno UTC del giorno italiano: spostandosi di 24 h non si cambia mai giorno per l'ora legale.
  const [y, m, d] = romeDay(now).split("-").map(Number);
  const noon = Date.UTC(y, m - 1, d, 12);
  return Array.from({ length: days }, (_, i) => new Date(noon - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

/** Valori giorno per giorno, zero dove non c'è niente. */
export function fillDaily(rows: { day: string; n: number }[], keys: string[]): number[] {
  const by = new Map(rows.map((r) => [r.day, r.n]));
  return keys.map((k) => by.get(k) ?? 0);
}

/** Variazione % rispetto al periodo precedente; null se prima non c'era niente. */
export const change = (current: number, previous: number) => (previous ? Math.round(((current - previous) / previous) * 100) : null);

/** % di chi passa da un passo al successivo; null se manca la base o il dato non è coerente (es. richieste arrivate senza clic tracciato). */
export const stepRate = (part: number, total: number) => (total && part <= total ? Math.round((part / total) * 100) : null);

/** Per ogni giorno, se era coperto da almeno un boost (giorni di calendario a Roma). */
export function boostedDays(keys: string[], boosts: { startsAt: Date; endsAt: Date }[]): boolean[] {
  const ranges = boosts.map((b) => [romeDay(b.startsAt), romeDay(new Date(b.endsAt.getTime() - 1))] as const);
  return keys.map((k) => ranges.some(([from, to]) => from <= k && k <= to));
}

/** Aumento ipotizzato delle visite con un boost quando lo storico del partner non basta (da confermare coi dati reali). */
export const DEFAULT_BOOST_UPLIFT = 1.8;

/**
 * Quante volte crescono le visite nei giorni con boost rispetto agli altri, misurato sullo storico del partner.
 * Null con meno di 3 giorni di boost, meno di 7 senza o nessuna visita di base. Limitato tra 1 e 4.
 */
export function boostUplift(views: number[], boosted: boolean[]): number | null {
  const on = views.filter((_, i) => boosted[i]);
  const off = views.filter((_, i) => !boosted[i]);
  if (on.length < 3 || off.length < 7) return null;
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const base = mean(off);
  if (base === 0) return null;
  return Math.min(4, Math.max(1, Math.round((mean(on) / base) * 10) / 10));
}

/** Visite cumulate nei prossimi `horizon` giorni senza e con un boost di `boostDays` giorni che parte oggi. */
export function projectBoost({ viewsPerDay, uplift, boostDays, horizon }: { viewsPerDay: number; uplift: number; boostDays: number; horizon: number }) {
  const without: number[] = [];
  const withBoost: number[] = [];
  for (let i = 0; i < horizon; i++) {
    without.push((without[i - 1] ?? 0) + viewsPerDay);
    withBoost.push((withBoost[i - 1] ?? 0) + viewsPerDay * (i < boostDays ? uplift : 1));
  }
  return { without, with: withBoost, extraViews: (withBoost.at(-1) ?? 0) - (without.at(-1) ?? 0) };
}
