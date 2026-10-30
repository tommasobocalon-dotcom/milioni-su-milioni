import Link from "next/link";
import { Star } from "lucide-react";
import type { ServicePrice } from "@/lib/data/prices";
import { formatEuro, formatPriceRange, formatRating, type PriceUnit } from "@/lib/domain/format";
import { scalePosition, type PriceSummary, type SqmSummary } from "@/lib/domain/price-compare";

/*
 * Grafici di /confronta-prezzi, una sola serie e un solo colore (primary): niente legenda, il titolo della
 * sezione dice cosa si vede. Le barre crescono da sinistra (classe "cresce" in globals.css) quando entrano
 * nello schermo; ogni valore è scritto accanto alla sua barra, quindi il grafico si legge anche senza colori.
 */

/** Fasce di prezzo dei partner per un servizio, sulla stessa scala, con il prezzo tipico come tacca scura. */
export function PriceRangeChart({ prices, summary, unit }: { prices: ServicePrice[]; summary: PriceSummary; unit: PriceUnit }) {
  const medianAt = scalePosition(summary.median, summary.min, summary.max) * 100;
  return (
    <figure className="flex flex-col gap-3">
      <ol className="flex flex-col">
        {prices.map((p, i) => {
          const low = p.from ?? p.to ?? 0;
          const high = p.to ?? p.from ?? 0;
          const left = scalePosition(low, summary.min, summary.max) * 100;
          const right = scalePosition(high, summary.min, summary.max) * 100;
          return (
            <li
              key={p.partnerId}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-md px-3 py-3 transition-colors hover:bg-subtle md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_9rem]"
            >
              <div className="min-w-0">
                <Link href={p.href} className="font-semibold text-ink hover:text-primary hover:underline">
                  {p.displayName}
                </Link>
                <p className="flex items-center gap-1 text-caption text-ink-2">
                  {p.municipalityName} ({p.provinceCode})
                  {p.rating.count > 0 && (
                    <>
                      {" · "}
                      <Star className="size-3 fill-star text-star" aria-hidden />
                      {formatRating(p.rating.average)}
                    </>
                  )}
                </p>
              </div>
              <p className="text-right text-body-s font-semibold tabular-nums md:order-last">{formatPriceRange(p.from, p.to, unit)}</p>
              <div className="relative col-span-2 h-3 rounded-full bg-muted md:col-span-1" aria-hidden>
                <span
                  className="cresce absolute inset-y-0 rounded-full bg-primary"
                  style={{ left: `${Math.min(left, 98)}%`, width: `max(0.75rem, ${right - left}%)`, "--i": i } as React.CSSProperties}
                />
                <span className="absolute -inset-y-1 w-0.5 rounded-full bg-ink" style={{ left: `${medianAt}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 text-caption text-ink-2">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-6 rounded-full bg-primary" aria-hidden /> Fascia di prezzo del partner
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-0.5 rounded-full bg-ink" aria-hidden /> Prezzo tipico ({formatEuro(summary.median)})
        </span>
        <span>Scala da {formatEuro(summary.min)} a {formatEuro(summary.max)}</span>
      </figcaption>
    </figure>
  );
}

/** Barre orizzontali sulla stessa scala, con il valore scritto alla fine di ogni barra. */
export function ValueBars({ rows, label }: { rows: { key: string; name: string; value: number; valueLabel: string; note?: string }[]; label: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul aria-label={label} className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="truncate font-semibold">{r.name}</p>
            {r.note && <p className="text-caption text-ink-2">{r.note}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span
              className="cresce h-5 rounded-r-sm bg-primary"
              style={{ width: `${Math.max(4, (r.value / max) * 78)}%`, "--i": i } as React.CSSProperties}
              aria-hidden
            />
            <span className="shrink-0 text-body-s font-semibold tabular-nums">{r.valueLabel}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tre numeri grandi in fila: si leggono prima del grafico. */
export function PriceFigures({ items }: { items: { label: string; value: string; note?: string }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((f) => (
        <div key={f.label} className="entra flex flex-col gap-1 rounded-lg bg-surface p-5">
          <dt className="text-body-s text-ink-2">{f.label}</dt>
          <dd className="font-display text-h1 tabular-nums">{f.value}</dd>
          {f.note && <dd className="text-caption text-ink-2">{f.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function sqmLabel(s: SqmSummary) {
  return `${formatEuro(s.average)}/m²`;
}
