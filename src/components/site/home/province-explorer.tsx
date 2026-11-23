"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, MapPin, Search, Send } from "lucide-react";
import { PROVINCE_BLOCKS } from "@/lib/data/home-content";
import { VENETO_PROVINCES, VENETO_VIEWBOX } from "@/lib/data/veneto-map";
import { isActiveProvince } from "@/lib/domain/coverage";
import { cn } from "@/lib/utils";
import { ProvinceRequestDialog } from "./province-request-dialog";

type Block = (typeof PROVINCE_BLOCKS)[number];

const hrefFor = (city: string) => `/trova-professionista?dove=${encodeURIComponent(city)}`;

/** Prima le province dove si cerca già (Treviso), poi le altre nell'ordine di sempre. */
const BLOCKS = [...PROVINCE_BLOCKS].sort((a, b) => Number(isActiveProvince(b.code)) - Number(isActiveProvince(a.code)));

/**
 * "Professionisti di fiducia" sul modello del "coast to coast" di Thumbtack: una scheda per provincia con lo
 * slogan, la mappa del Veneto (confini ISTAT) che si accende insieme alla scheda, e "Cerca la tua città".
 * Dal 23/11/2026 si cerca solo nelle province attive (Treviso, `ACTIVE_PROVINCES`): le altre restano cliccabili e
 * aprono "Inoltra una richiesta", che conta nel gestionale quanta gente le chiede.
 * La mappa è un'illustrazione: i controlli veri sono le schede.
 */
export function ProvinceExplorer() {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const [requestFor, setRequestFor] = useState<Block | null>(null);

  const open = (b: Block) => (isActiveProvince(b.code) ? router.push(hrefFor(b.city)) : setRequestFor(b));
  const hover = (code: string) => ({
    onMouseEnter: () => setActive(code),
    onMouseLeave: () => setActive(null),
    onFocus: () => setActive(code),
    onBlur: () => setActive(null),
  });

  return (
    <>
      <div className="mt-12 grid grid-cols-1 items-center gap-10 lg:mt-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div data-reveal className="relative mx-auto flex w-full max-w-[18rem] flex-col gap-5 sm:max-w-sm lg:max-w-none">
          <svg viewBox={VENETO_VIEWBOX} className="h-auto w-full" aria-hidden>
            {VENETO_PROVINCES.map((p) => {
              const block = PROVINCE_BLOCKS.find((b) => b.code === p.code);
              const on = active === p.code;
              const live = isActiveProvince(p.code);
              return (
                <g
                  key={p.code}
                  className="cursor-pointer"
                  onMouseEnter={() => setActive(p.code)}
                  onMouseLeave={() => setActive(null)}
                  onClick={() => block && open(block)}
                >
                  <path
                    d={p.d}
                    className={cn(
                      "stroke-surface stroke-[3] transition-[fill] duration-300",
                      live ? (on ? "fill-bosco-600" : "fill-primary") : on ? "fill-salvia-500" : active ? "fill-salvia-200" : "fill-salvia-300",
                    )}
                    strokeLinejoin="round"
                  />
                  <text
                    x={p.label[0]}
                    y={p.label[1]}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={cn("pointer-events-none text-[22px] font-bold", live ? "fill-on-brand" : "fill-brand")}
                  >
                    {p.code}
                  </text>
                </g>
              );
            })}
          </svg>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-body-s text-ink-2">
            <li className="inline-flex items-center gap-2">
              <span className="size-3 rounded-sm bg-primary" aria-hidden /> Attiva: cerca subito
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="size-3 rounded-sm bg-salvia-300" aria-hidden /> In arrivo: inoltra una richiesta
            </li>
          </ul>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BLOCKS.map((b, i) => {
            const on = active === b.code;
            const shift = { "--reveal-shift": `${(i % 2) * 6}%` } as React.CSSProperties;
            const title = <span className="font-display text-h3 tracking-[-0.01em]">{b.name}</span>;
            if (isActiveProvince(b.code)) {
              return (
                <li key={b.code} data-reveal style={shift}>
                  <Link
                    href={hrefFor(b.city)}
                    {...hover(b.code)}
                    className={cn("flex h-full flex-col gap-1 rounded-lg px-5 py-4 text-on-brand transition-colors duration-200", on ? "bg-bosco-700" : "bg-brand")}
                  >
                    {title}
                    <span className="text-body text-salvia-200">{b.slogan}</span>
                    <span className="mt-2 inline-flex items-center gap-2 text-body-s font-semibold">
                      Cerca professionisti e agenzie
                      <ArrowRight className={cn("size-4 shrink-0 transition-transform duration-200", on && "translate-x-1")} aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            }
            return (
              <li key={b.code} data-reveal style={shift}>
                <button
                  type="button"
                  onClick={() => open(b)}
                  aria-haspopup="dialog"
                  {...hover(b.code)}
                  className={cn(
                    "flex h-full w-full flex-col gap-1 rounded-lg px-5 py-4 text-left text-ink transition-colors duration-200",
                    on ? "bg-brand-soft" : "bg-surface",
                  )}
                >
                  {title}
                  <span className="text-body text-ink-2">{b.slogan}</span>
                  <span className="mt-2 inline-flex items-center gap-2 text-body-s font-semibold text-primary">
                    <Send className="size-4 shrink-0" aria-hidden /> Inoltra una richiesta per la provincia
                  </span>
                </button>
              </li>
            );
          })}
          <li data-reveal style={{ "--reveal-shift": "6%" } as React.CSSProperties}>
            <form
              action="/trova-professionista"
              method="get"
              role="search"
              aria-labelledby="cerca-citta"
              className="flex h-full flex-col gap-3 rounded-lg bg-brand-soft px-5 py-4"
            >
              <label id="cerca-citta" htmlFor="cerca-citta-input" className="font-display text-h3 tracking-[-0.01em]">
                Cerca la tua città
              </label>
              <div className="flex h-11 items-center gap-2 rounded-full bg-surface pr-1 pl-3.5 focus-within:ring-2 focus-within:ring-primary">
                <MapPin className="size-4 shrink-0 text-ink-2" aria-hidden />
                <input
                  id="cerca-citta-input"
                  name="dove"
                  list="comuni-veneto"
                  placeholder="Es. Conegliano, Oderzo"
                  autoComplete="off"
                  className="w-full min-w-0 bg-transparent text-body text-ink placeholder:text-ink-2 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand transition-[background-color,transform] duration-150 hover:bg-bosco-700 active:scale-95"
                >
                  <Search className="size-4" aria-hidden />
                  <span className="sr-only">Cerca</span>
                </button>
              </div>
            </form>
          </li>
        </ul>
      </div>
      <ProvinceRequestDialog province={requestFor} onClose={() => setRequestFor(null)} />
    </>
  );
}
