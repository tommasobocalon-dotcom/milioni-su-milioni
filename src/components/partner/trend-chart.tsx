"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export type TrendMetric = { key: string; label: string; values: number[] };

const dayFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });
const fmtDay = (key: string, long = false) => (long ? longFmt : dayFmt).format(new Date(`${key}T12:00:00Z`));

/** Massimo dell'asse arrotondato a un numero pulito (1, 2, 5 × 10^n). */
function niceMax(max: number) {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= max)!;
  return step * pow;
}

/**
 * Andamento giorno per giorno di una metrica alla volta (colonne, una sola serie).
 * I giorni con un boost attivo hanno lo sfondo ambra. Mouse e tastiera (frecce) mostrano il valore
 * del giorno; gli stessi dati sono nella tabella sotto il grafico.
 */
export function TrendChart({ days, metrics, boostDays }: { days: string[]; metrics: TrendMetric[]; boostDays: boolean[] }) {
  const [metricKey, setMetricKey] = useState(metrics[0].key);
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0];
  const top = niceMax(Math.max(...metric.values));
  const total = metric.values.reduce((a, b) => a + b, 0);
  const hasBoost = boostDays.some(Boolean);
  const shown = active ?? null;

  const pick = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const i = Math.floor(((clientX - r.left) / r.width) * days.length);
    setActive(Math.min(days.length - 1, Math.max(0, i)));
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Metrica del grafico" className="flex flex-wrap gap-1 rounded-md bg-muted p-1 self-start">
        {metrics.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={m.key === metric.key}
            onClick={() => setMetricKey(m.key)}
            className={cn(
              "rounded-[6px] px-3 py-1.5 text-body-s font-medium transition-colors",
              m.key === metric.key ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="text-body-s text-ink-2" aria-live="polite">
        {shown != null ? (
          <>
            <span className="font-semibold text-ink">{metric.values[shown]}</span> {metric.label.toLowerCase()} · {fmtDay(days[shown], true)}
            {boostDays[shown] && " · in evidenza"}
          </>
        ) : (
          <>
            <span className="font-semibold text-ink">{total}</span> {metric.label.toLowerCase()} nel periodo
          </>
        )}
      </p>

      <div className="flex gap-2">
        {/* Asse Y: tre valori puliti */}
        <div className="flex h-44 flex-col justify-between text-right text-caption tabular-nums text-ink-3" aria-hidden>
          <span className="-translate-y-1/2">{top}</span>
          <span>{top / 2}</span>
          <span className="translate-y-1/2">0</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div
            role="img"
            aria-label={`${metric.label} giorno per giorno: ${total} in tutto. Usa le frecce per leggere i singoli giorni.`}
            tabIndex={0}
            className="relative h-44 cursor-crosshair rounded-sm focus-visible:outline-offset-4"
            onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
              e.preventDefault();
              const last = days.length - 1;
              setActive((a) => {
                if (e.key === "Home") return 0;
                if (e.key === "End") return last;
                if (a == null) return last;
                return Math.min(last, Math.max(0, a + (e.key === "ArrowRight" ? 1 : -1)));
              });
            }}
          >
            {/* Griglia: linee sottili e piene */}
            <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
              <div className="border-t border-line" />
              <div className="border-t border-line" />
              <div className="border-t border-ink-3/60" />
            </div>
            <div className="absolute inset-0 flex items-end" aria-hidden>
              {metric.values.map((v, i) => (
                <div key={days[i]} className={cn("relative flex h-full flex-1 items-end justify-center px-px", boostDays[i] && "bg-sponsor")}>
                  {active === i && <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink-3" />}
                  <div
                    className={cn(
                      "relative w-full max-w-6 rounded-t-[4px] transition-colors",
                      active === i ? "bg-primary-hover" : "bg-primary",
                    )}
                    style={{ height: v ? `max(${(v / top) * 100}%, 2px)` : 0 }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between text-caption text-ink-3" aria-hidden>
            <span>{fmtDay(days[0])}</span>
            {days.length > 14 && <span>{fmtDay(days[Math.floor(days.length / 2)])}</span>}
            <span>{fmtDay(days[days.length - 1])}</span>
          </div>
        </div>
      </div>

      {hasBoost && (
        <p className="inline-flex items-center gap-2 text-caption text-ink-2">
          <span className="inline-block size-3 rounded-[3px] border border-ambra-500/40 bg-sponsor" aria-hidden />
          Giorni con un boost attivo
        </p>
      )}

      <details className="text-body-s">
        <summary className="cursor-pointer text-ink-2 underline-offset-2 hover:underline">Vedi i dati come tabella</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-md border border-line">
          <table className="w-full text-left text-body-s">
            <caption className="sr-only">{metric.label} giorno per giorno</caption>
            <thead className="sticky top-0 bg-surface text-caption text-ink-2">
              <tr>
                <th id={`${id}-d`} className="px-3 py-2 font-medium">Giorno</th>
                {metrics.map((m) => (
                  <th key={m.key} className="px-3 py-2 text-right font-medium">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {days
                .map((d, i) => (
                  <tr key={d}>
                    <th scope="row" className="px-3 py-1.5 font-normal">
                      {fmtDay(d, true)}
                      {boostDays[i] && <span className="ml-1 text-caption text-ink-2">(in evidenza)</span>}
                    </th>
                    {metrics.map((m) => (
                      <td key={m.key} className="px-3 py-1.5 text-right">
                        {m.values[i]}
                      </td>
                    ))}
                  </tr>
                ))
                .reverse()}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
