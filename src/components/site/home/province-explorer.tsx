"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { AreaRequestForm, type AreaCategory, type AreaPlace } from "@/components/site/area-request-form";
import { PROVINCE_BLOCKS } from "@/lib/data/home-content";
import { VENETO_PROVINCES, VENETO_VIEWBOX } from "@/lib/data/veneto-map";
import { isProvinceOpen } from "@/lib/domain/open-areas";
import { cn } from "@/lib/utils";

const hrefFor = (city: string) => `/trova-professionista?dove=${encodeURIComponent(city)}`;

type Block = (typeof PROVINCE_BLOCKS)[number];

// Prima le province attive, poi le altre nell'ordine di sempre.
const BLOCKS = [...PROVINCE_BLOCKS].sort((a, b) => Number(isProvinceOpen(b.code)) - Number(isProvinceOpen(a.code)));

/**
 * "Professionisti di fiducia" sul modello del "coast to coast" di Thumbtack: una scheda per provincia con lo
 * slogan, la mappa del Veneto (confini ISTAT) che si accende insieme alla scheda, e "Cerca la tua città".
 * Si parte dalla provincia di Treviso (src/lib/domain/open-areas.ts): le altre aprono il modulo "Inoltra una richiesta".
 */
export function ProvinceExplorer({ categories, places }: { categories: AreaCategory[]; places: AreaPlace[] }) {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const [asking, setAsking] = useState<Block | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  function open(b: Block) {
    if (isProvinceOpen(b.code)) return router.push(hrefFor(b.city));
    setAsking(b);
    dialog.current?.showModal();
  }

  return (
    <div className="mt-12 grid grid-cols-1 items-center gap-10 lg:mt-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
      <div data-reveal className="relative mx-auto w-full max-w-[18rem] sm:max-w-sm lg:max-w-none">
        {/* La mappa è un'illustrazione: i controlli veri, raggiungibili da tastiera, sono le schede. */}
        <svg viewBox={VENETO_VIEWBOX} className="h-auto w-full" aria-hidden>
          {VENETO_PROVINCES.map((p) => {
            const block = PROVINCE_BLOCKS.find((b) => b.code === p.code);
            const live = isProvinceOpen(p.code);
            const on = active === p.code;
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
                    live ? (on ? "fill-bosco-600" : "fill-primary") : on ? "fill-salvia-400" : "fill-salvia-200",
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
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BLOCKS.map((b, i) => {
          const on = active === b.code;
          const live = isProvinceOpen(b.code);
          const hover = {
            onMouseEnter: () => setActive(b.code),
            onMouseLeave: () => setActive(null),
            onFocus: () => setActive(b.code),
            onBlur: () => setActive(null),
          };
          const name = (
            <span className="flex items-center justify-between gap-3">
              <span className="font-display text-h3 tracking-[-0.01em]">{b.name}</span>
              <ArrowRight
                className={cn("size-5 shrink-0 transition-[transform,opacity] duration-200", on ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0")}
                aria-hidden
              />
            </span>
          );
          return (
            <li key={b.code} data-reveal style={{ "--reveal-shift": `${(i % 2) * 6}%` } as React.CSSProperties}>
              {live ? (
                <Link
                  href={hrefFor(b.city)}
                  {...hover}
                  className={cn(
                    "flex h-full flex-col gap-1 rounded-lg px-5 py-4 text-on-brand transition-colors duration-200",
                    on ? "bg-bosco-600" : "bg-brand",
                  )}
                >
                  {name}
                  <span className="text-body text-salvia-200">{b.slogan}</span>
                  <span className="mt-1 text-body-s font-semibold">Cerca professionisti e agenzie</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => open(b)}
                  {...hover}
                  aria-haspopup="dialog"
                  className={cn(
                    "flex h-full w-full cursor-pointer flex-col gap-1 rounded-lg px-5 py-4 text-left text-ink transition-colors duration-200",
                    on ? "bg-salvia-100" : "bg-surface",
                  )}
                >
                  {name}
                  <span className="text-body text-ink-2">{b.slogan}</span>
                  <span className="mt-1 text-body-s font-semibold text-primary underline underline-offset-2">Inoltra una richiesta</span>
                </button>
              )}
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
                placeholder="Es. Mestre, Castelfranco"
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

      <dialog
        ref={dialog}
        aria-labelledby="richiesta-zona-titolo"
        onClose={() => setAsking(null)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-surface p-0 text-ink shadow-float backdrop:bg-black/40"
      >
        {asking && (
          <AreaRequestForm
            key={asking.code}
            province={asking}
            titleId="richiesta-zona-titolo"
            categories={categories}
            places={places.filter((p) => p.provinceCode === asking.code)}
            onClose={() => dialog.current?.close()}
          />
        )}
      </dialog>
    </div>
  );
}
