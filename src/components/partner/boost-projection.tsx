"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Coins, Eye, Inbox, Rocket, TrendingUp } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { formatEuro } from "@/lib/domain/format";
import { BOOST_OPTIONS, TOKEN_PACKAGES } from "@/lib/domain/offers";
import { DEFAULT_BOOST_UPLIFT, projectBoost } from "@/lib/domain/stats";
import { cn } from "@/lib/utils";

const HORIZON = 30;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 32, left: 44 };
const nf = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
/** Costo indicativo di un token al prezzo del pacchetto medio. */
const MID = TOKEN_PACKAGES[1];
const tokenCents = (tokens: number) => Math.round((tokens * MID.priceCents) / MID.tokens);

/** Larghezza del contenitore, per disegnare il grafico in pixel reali (testo non deformato). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Tacche "tonde" per l'asse delle visite. */
function niceTicks(max: number, count = 4): number[] {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/**
 * Stima di quante visite e richieste in più porta un boost a token nei prossimi 30 giorni.
 * `measuredUplift` arriva dallo storico del partner (boostUplift); se manca si usa il valore provvisorio.
 */
export function BoostProjection({
  viewsPerDay,
  leadsPerView,
  measuredUplift,
  tokenBalance,
}: {
  viewsPerDay: number;
  leadsPerView: number;
  measuredUplift: number | null;
  tokenBalance: number;
}) {
  const [days, setDays] = useState<number>(BOOST_OPTIONS[1].days);
  const [hover, setHover] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();
  const option = BOOST_OPTIONS.find((o) => o.days === days) ?? BOOST_OPTIONS[1];
  const uplift = measuredUplift ?? DEFAULT_BOOST_UPLIFT;
  const p = useMemo(() => projectBoost({ viewsPerDay, uplift, boostDays: option.days, horizon: HORIZON }), [viewsPerDay, uplift, option.days]);
  const extraLeads = p.extraViews * leadsPerView;
  const enough = tokenBalance >= option.tokens;

  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const ticks = niceTicks(Math.max(1, p.with.at(-1) ?? 1));
  const yMax = ticks.at(-1)!;
  const x = (i: number) => PAD.left + (i / (HORIZON - 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;
  const line = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const gap = `${line(p.with)}${p.without
    .map((v, i) => [i, v] as const)
    .reverse()
    .map(([i, v]) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join("")}Z`;
  const bandEnd = x(Math.min(option.days, HORIZON) - 1);

  return (
    <section aria-labelledby="boost-projection-title" className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="boost-projection-title" className="inline-flex items-center gap-2 text-h3 font-semibold">
            <TrendingUp className="size-5" aria-hidden /> Quanto puoi crescere in evidenza
          </h2>
          <p className="text-body-s text-ink-2">Visite alla scheda stimate nei prossimi {HORIZON} giorni, in evidenza e senza.</p>
        </div>
        <div role="radiogroup" aria-label="Durata" className="inline-flex self-start rounded-md border border-line bg-page p-1">
          {BOOST_OPTIONS.map((o) => (
            <button
              key={o.days}
              type="button"
              role="radio"
              aria-checked={o.days === days}
              onClick={() => setDays(o.days)}
              className={cn(
                "rounded-sm px-3 py-1.5 text-body-s font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                o.days === days ? "bg-primary text-on-brand" : "text-ink-2 hover:bg-subtle hover:text-ink",
              )}
            >
              {o.days} giorni · {o.tokens} crediti
            </button>
          ))}
        </div>
      </div>

      {viewsPerDay === 0 ? (
        <p className="rounded-md bg-muted p-5 text-body-s text-ink-2">
          Non ci sono ancora abbastanza visite per fare una stima. Torna qui dopo qualche giorno con la scheda online.
        </p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="flex min-w-0 flex-col gap-3">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-caption text-ink-2" aria-label="Legenda">
              <li className="inline-flex items-center gap-2">
                <span className="h-0.5 w-5 rounded-full bg-primary" aria-hidden /> In evidenza per {option.days} giorni
              </li>
              <li className="inline-flex items-center gap-2">
                <span className="h-0.5 w-5 rounded-full bg-neutro-400" aria-hidden /> Senza evidenza
              </li>
              <li className="inline-flex items-center gap-2">
                <span className="size-3 rounded-sm bg-sponsor" aria-hidden /> Giorni in evidenza
              </li>
            </ul>
            <div ref={ref} className="relative w-full min-w-0 overflow-hidden" onMouseLeave={() => setHover(null)}>
              <svg
                width={width}
                height={H}
                role="img"
                aria-label={`In evidenza per ${option.days} giorni: circa ${nf.format(p.with.at(-1)!)} visite in ${HORIZON} giorni invece di ${nf.format(p.without.at(-1)!)}.`}
                className="block"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const i = Math.round(((e.clientX - r.left - PAD.left) / innerW) * (HORIZON - 1));
                  setHover(Math.min(HORIZON - 1, Math.max(0, i)));
                }}
              >
                <rect x={PAD.left} y={PAD.top} width={Math.max(0, bandEnd - PAD.left)} height={innerH} className="fill-sponsor" />
                {ticks.map((t) => (
                  <g key={t}>
                    <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
                    <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-2 text-[11px] tabular-nums">
                      {nf.format(t)}
                    </text>
                  </g>
                ))}
                {[0, 9, 19, 29].map((i) => (
                  <text key={i} x={x(i)} y={H - 10} textAnchor={i === 0 ? "start" : i === 29 ? "end" : "middle"} className="fill-ink-2 text-[11px]">
                    {i === 0 ? "Oggi" : `+${i} gg`}
                  </text>
                ))}
                <path d={gap} className="fill-salvia-200" opacity={0.7} />
                <path d={line(p.without)} fill="none" className="stroke-neutro-400" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <path d={line(p.with)} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={x(HORIZON - 1)} cy={y(p.with.at(-1)!)} r={4} className="fill-primary stroke-surface" strokeWidth={2} />
                {hover !== null && (
                  <g pointerEvents="none">
                    <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className="stroke-ink-3" strokeWidth={1} />
                    <circle cx={x(hover)} cy={y(p.without[hover])} r={4} className="fill-neutro-400 stroke-surface" strokeWidth={2} />
                    <circle cx={x(hover)} cy={y(p.with[hover])} r={4} className="fill-primary stroke-surface" strokeWidth={2} />
                  </g>
                )}
              </svg>
              {hover !== null && (
                <div
                  className="pointer-events-none absolute top-2 z-10 w-48 rounded-md border border-line bg-surface p-3 text-caption shadow-float"
                  style={x(hover) > width / 2 ? { right: width - x(hover) + 12 } : { left: x(hover) + 12 }}
                >
                  <p className="mb-1.5 font-semibold text-ink">{hover === 0 ? "Oggi" : `Fra ${hover} ${hover === 1 ? "giorno" : "giorni"}`}</p>
                  <p className="flex justify-between gap-3 text-ink-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-primary" aria-hidden /> In evidenza
                    </span>
                    <span className="font-semibold text-ink tabular-nums">{nf.format(p.with[hover])}</span>
                  </p>
                  <p className="flex justify-between gap-3 text-ink-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-neutro-400" aria-hidden /> Senza
                    </span>
                    <span className="font-semibold text-ink tabular-nums">{nf.format(p.without[hover])}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-3 xl:grid-cols-1">
              <div className="rounded-md bg-subtle p-4">
                <dt className="inline-flex items-center gap-1.5 text-caption text-ink-2">
                  <Eye className="size-3.5" aria-hidden /> Visite in più
                </dt>
                <dd className="font-display text-h2 tabular-nums">+{nf.format(p.extraViews)}</dd>
              </div>
              <div className="rounded-md bg-subtle p-4">
                <dt className="inline-flex items-center gap-1.5 text-caption text-ink-2">
                  <Inbox className="size-3.5" aria-hidden /> Richieste in più
                </dt>
                <dd className="font-display text-h2 tabular-nums">
                  {leadsPerView > 0 ? `≈ ${nf.format(Math.max(extraLeads, 0))}` : "–"}
                </dd>
              </div>
              <div className="col-span-2 rounded-md border border-line p-4 xl:col-span-1">
                <dt className="inline-flex items-center gap-1.5 text-caption text-ink-2">
                  <Coins className="size-3.5" aria-hidden /> Costo
                </dt>
                <dd className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-h3 tabular-nums">{option.tokens} crediti</span>
                  <span className="text-caption text-ink-2">≈ {formatEuro(tokenCents(option.tokens))} + IVA</span>
                </dd>
                <dd className={cn("mt-1 text-caption", enough ? "text-success" : "text-ink-2")}>
                  {enough ? `Hai ${tokenBalance} crediti: ti bastano` : `Hai ${tokenBalance} crediti: te ne servono altri ${option.tokens - tokenBalance}`}
                </dd>
              </div>
            </dl>
            <ButtonLink href="/area-partner/token" className="w-full">
              <Rocket aria-hidden /> {enough ? "Metti in evidenza" : "Compra crediti"}
            </ButtonLink>
          </div>
        </div>
      )}

      <p className="text-caption text-ink-2">
        {measuredUplift
          ? `Stima basata sui tuoi periodi in evidenza precedenti: in quei giorni le visite sono state ${measuredUplift.toLocaleString("it-IT")} volte quelle normali.`
          : `Stima indicativa: non hai ancora abbastanza giorni in evidenza per misurare l'effetto sui tuoi dati, quindi ipotizziamo visite ${DEFAULT_BOOST_UPLIFT.toLocaleString("it-IT")} volte quelle normali.`}{" "}
        Partiamo dalla tua media attuale di {viewsPerDay.toLocaleString("it-IT", { maximumFractionDigits: 1 })} visite al giorno
        {leadsPerView > 0 && ` e da ${(leadsPerView * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })} richieste ogni 100 visite`}. Non è una garanzia di
        risultato. Durante il periodo in evidenza la scheda è etichettata come “Sponsorizzato”.
      </p>
    </section>
  );
}
