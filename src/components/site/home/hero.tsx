import { Lock } from "lucide-react";
import { getMunicipalities } from "@/lib/data/catalog";
import { getHomeStats, HOME_STATS_MIN } from "@/lib/data/home";
import { HERO_SLIDES } from "@/lib/data/home-content";
import { HeroSearchWatcher } from "@/components/site/header-client";
import { HeroSearchForm } from "./hero-search-form";
import { HeroSlides } from "./hero-slides";

/**
 * Hero sul modello di Thumbtack: video a tutto schermo, titolo grande, ricerca in una scheda bianca,
 * riga di fiducia e numeri veri dal database. La ricerca porta a /cerca come prima (PRD §5.1).
 */
export async function Hero({ next }: { next: string }) {
  const places = await getMunicipalities();

  return (
    <section
      aria-labelledby="hero-titolo"
      className="relative isolate flex min-h-dvh md:min-h-[calc(100dvh-72px)] flex-col overflow-hidden bg-black text-on-brand"
    >
      <HeroSlides slides={HERO_SLIDES} next={next}>
        <div className="relative z-10 mx-auto flex w-full max-w-[946px] flex-1 flex-col justify-center px-4 py-10 min-[482px]:px-8 md:py-0 min-[1011px]:px-0">
          <div className="flex max-w-[600px] flex-col min-[482px]:max-w-[588px]">
            <h1
              id="hero-titolo"
              className="hero-rise font-display text-[2.25rem] [font-variation-settings:'wght'_500] leading-[1.05] tracking-[-0.02em] text-balance min-[482px]:text-[3rem]"
            >
              Casa tua, in buone mani.
            </h1>
            <p className="hero-rise mt-4 mb-6 max-w-[460px] text-body leading-[1.3] font-normal [animation-delay:80ms]">
              Agenzie, tecnici e artigiani verificati del Veneto, per lavori grandi e piccoli: tutto in un posto solo.
            </p>

            <HeroSearchForm>
              <datalist id="comuni-veneto">
                {places.map((p) => (
                  <option key={p.id} value={`${p.name} (${p.provinceCode})`} />
                ))}
              </datalist>
            </HeroSearchForm>

            <p className="hero-rise mt-[18px] flex items-center gap-2 text-body-s [animation-delay:240ms]">
              <Lock className="size-[18px] shrink-0" aria-hidden />
              Nessuna chiamata finché non sei tu a chiederla.
            </p>
            <HeroStats />
            <HeroSearchWatcher />
          </div>
        </div>
      </HeroSlides>
    </section>
  );
}

/** Partner verificati e tipi di professionisti: si mostrano solo sopra una soglia minima (dati reali). */
async function HeroStats() {
  const s = await getHomeStats();
  if (s.partners < HOME_STATS_MIN.partners) return null;
  const items = [
    { value: s.partners.toLocaleString("it-IT"), label: "partner verificati" },
    { value: s.categories.toLocaleString("it-IT"), label: "tipi di professionisti" },
  ];
  return (
    <dl className="hero-rise mt-4 flex flex-wrap gap-6 [animation-delay:320ms]">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col-reverse">
          <dt className="mt-2 text-body-s">{it.label}</dt>
          <dd className="font-display text-[1.75rem] leading-[1.1] tracking-[-0.02em]">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
