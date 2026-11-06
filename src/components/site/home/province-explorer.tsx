"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { PROVINCE_BLOCKS } from "@/lib/data/home-content";
import { VENETO_PROVINCES, VENETO_VIEWBOX } from "@/lib/data/veneto-map";
import { cn } from "@/lib/utils";

const hrefFor = (city: string) => `/trova-professionista?dove=${encodeURIComponent(city)}`;

/**
 * "Professionisti di fiducia" sul modello del "coast to coast" di Thumbtack: una scheda per provincia con lo
 * slogan, la mappa del Veneto (confini ISTAT) che si accende insieme alla scheda, e "Cerca la tua città".
 * La mappa è un'illustrazione: i link veri sono le schede.
 */
export function ProvinceExplorer() {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="mt-12 grid grid-cols-1 items-center gap-10 lg:mt-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
      <div data-reveal className="relative mx-auto w-full max-w-[18rem] sm:max-w-sm lg:max-w-none">
        {/* Il geco si arrampica sulle Dolomiti, in provincia di Belluno. */}
        <svg viewBox={VENETO_VIEWBOX} className="h-auto w-full" aria-hidden>
          {VENETO_PROVINCES.map((p) => {
            const block = PROVINCE_BLOCKS.find((b) => b.code === p.code);
            const on = active === p.code;
            return (
              <g
                key={p.code}
                className="cursor-pointer"
                onMouseEnter={() => setActive(p.code)}
                onMouseLeave={() => setActive(null)}
                onClick={() => block && router.push(hrefFor(block.city))}
              >
                <path
                  d={p.d}
                  className={cn(
                    "stroke-surface stroke-[3] transition-[fill] duration-300",
                    on ? "fill-primary" : active ? "fill-salvia-200" : "fill-salvia-300",
                  )}
                  strokeLinejoin="round"
                />
                <text
                  x={p.label[0]}
                  y={p.label[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn("pointer-events-none text-[22px] font-bold transition-[fill] duration-300", on ? "fill-on-brand" : "fill-brand")}
                >
                  {p.code}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PROVINCE_BLOCKS.map((b, i) => {
          const on = active === b.code;
          return (
            <li key={b.code} data-reveal style={{ "--reveal-shift": `${(i % 2) * 6}%` } as React.CSSProperties}>
              <Link
                href={hrefFor(b.city)}
                onMouseEnter={() => setActive(b.code)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(b.code)}
                onBlur={() => setActive(null)}
                className={cn(
                  "group/prov flex h-full flex-col gap-1 rounded-lg px-5 py-4 transition-colors duration-200",
                  on ? "bg-brand text-on-brand" : "bg-page text-ink",
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-h3 tracking-[-0.01em]">{b.name}</span>
                  <ArrowRight
                    className={cn("size-5 shrink-0 transition-[transform,opacity] duration-200", on ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0")}
                    aria-hidden
                  />
                </span>
                <span className={cn("text-body transition-colors", on ? "text-salvia-200" : "text-ink-2")}>{b.slogan}</span>
              </Link>
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
    </div>
  );
}
