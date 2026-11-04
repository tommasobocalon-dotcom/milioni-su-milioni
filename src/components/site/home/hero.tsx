import { ArrowRight, Lock, MapPin, Search, Star } from "lucide-react";
import { getMunicipalities } from "@/lib/data/catalog";
import { getHomeStats, HOME_STATS_MIN } from "@/lib/data/home";
import { HERO_SEARCH_ID, HERO_SLIDES } from "@/lib/data/home-content";
import { formatRating } from "@/lib/domain/format";
import { HeroSearchWatcher } from "@/components/site/header-client";
import { HeroSlides } from "./hero-slides";

/**
 * Hero sul modello di Thumbtack: foto a tutto schermo, titolo grande, ricerca in una scheda bianca,
 * riga di fiducia e numeri veri dal database. La ricerca porta a /cerca come prima (PRD §5.1).
 */
export async function Hero({ next }: { next: string }) {
  const places = await getMunicipalities();
  const slides = HERO_SLIDES.map((s) => ({ src: s.photo.src, label: s.label, caption: s.caption, href: s.href }));

  return (
    <section
      aria-labelledby="hero-titolo"
      className="relative isolate flex min-h-[max(640px,min(calc(100svh-72px),880px))] flex-col overflow-hidden bg-neutro-900 text-on-brand"
    >
      <HeroSlides slides={slides} next={next}>
        <div className="container-page relative z-10 flex flex-1 flex-col justify-center pt-14 pb-10 md:pt-20 md:pb-6">
          <div className="flex max-w-[37.5rem] flex-col">
            <h1
              id="hero-titolo"
              className="hero-rise font-display text-[2.75rem] leading-[1.02] tracking-[-0.025em] text-balance sm:text-[3.5rem] lg:text-[4rem]"
            >
              Casa tua, in buone mani.
            </h1>
            <p className="hero-rise mt-5 max-w-[31rem] text-body-l font-semibold [animation-delay:80ms]">
              Agenzie, tecnici e artigiani verificati del Veneto, per lavori grandi e piccoli: tutto in un posto solo.
            </p>

            <form
              id={HERO_SEARCH_ID}
              action="/cerca"
              method="get"
              role="search"
              aria-label="Cerca un professionista o un'agenzia"
              className="hero-rise mt-8 flex flex-col gap-3 rounded-lg bg-surface p-3 text-ink shadow-float [animation-delay:160ms] sm:p-4"
            >
              <label className="flex items-center gap-3 rounded-md px-2 py-2 focus-within:bg-page sm:px-3">
                <Search className="size-6 shrink-0 text-ink" aria-hidden />
                <span className="sr-only">Di cosa hai bisogno?</span>
                <input
                  name="q"
                  placeholder="Es. rifare il bagno, vendere casa"
                  autoComplete="off"
                  className="w-full min-w-0 bg-transparent text-body text-ink placeholder:text-ink-2 focus:outline-none sm:text-body-l"
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex h-12 items-center gap-2 rounded-full border border-line-strong px-4 focus-within:border-primary sm:w-48">
                  <MapPin className="size-5 shrink-0 text-ink-2" aria-hidden />
                  <span className="sr-only">Comune</span>
                  <input
                    name="dove"
                    list="comuni-veneto"
                    placeholder="Comune"
                    autoComplete="off"
                    className="w-full min-w-0 bg-transparent text-body text-ink placeholder:text-ink-2 focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="group/cta inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-body font-semibold text-on-brand transition-[background-color,transform] duration-150 hover:bg-bosco-700 active:scale-[0.98] sm:flex-1"
                >
                  Trova chi fa per te
                  <ArrowRight className="size-5 transition-transform duration-200 group-hover/cta:translate-x-1" aria-hidden />
                </button>
              </div>
              <datalist id="comuni-veneto">
                {places.map((p) => (
                  <option key={p.id} value={`${p.name} (${p.provinceCode})`} />
                ))}
              </datalist>
            </form>

            <p className="hero-rise mt-5 flex items-center gap-2.5 text-body [animation-delay:240ms]">
              <Lock className="size-5 shrink-0" aria-hidden />
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

/** Media voti, recensioni e partner verificati: si mostrano solo sopra una soglia minima (dati reali). */
async function HeroStats() {
  const s = await getHomeStats();
  if (s.reviews < HOME_STATS_MIN.reviews || s.partners < HOME_STATS_MIN.partners) return null;
  const items = [
    {
      value: (
        <>
          {formatRating(s.average)} <Star className="mb-1 inline size-6 fill-star text-star" aria-hidden />
        </>
      ),
      label: `su ${s.reviews.toLocaleString("it-IT")} recensioni verificate`,
      sr: `Valutazione media ${formatRating(s.average)} su 5`,
    },
    { value: s.partners.toLocaleString("it-IT"), label: "partner verificati", sr: undefined },
    { value: s.categories.toLocaleString("it-IT"), label: "tipi di professionisti", sr: undefined },
  ];
  return (
    <dl className="hero-rise mt-8 flex flex-wrap gap-x-10 gap-y-5 [animation-delay:320ms]">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col-reverse">
          <dt className="text-body">{it.label}</dt>
          <dd className="font-display text-[2.25rem] leading-tight tracking-[-0.02em]">
            {it.sr && <span className="sr-only">{it.sr}, </span>}
            <span aria-hidden={it.sr ? true : undefined}>{it.value}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
