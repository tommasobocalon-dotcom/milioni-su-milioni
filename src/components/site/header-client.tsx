"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronDown, MapPin, Search } from "lucide-react";
import { HERO_SEARCH_ID } from "@/lib/data/home-content";
import { cn } from "@/lib/utils";

/**
 * Cornice della navbar: ombra quando la pagina scorre. La ricerca compatta compare quando la ricerca della hero
 * esce dallo schermo (attributo data-hero-search su <html>, messo da HeroSearchWatcher), come su Thumbtack.
 * Niente usePathname qui: la navbar sta nel layout e deve restare statica anche nelle pagine dinamiche.
 */
export function HeaderFrame({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    const frame = window.requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Un clic su un link del menu mobile chiude il menu (la navbar non si ricarica tra una pagina e l'altra).
  function closeMenus(e: React.MouseEvent<HTMLElement>) {
    if ((e.target as HTMLElement).closest("a")) {
      e.currentTarget.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
    }
  }

  return (
    <header
      data-scrolled={scrolled}
      onClick={closeMenus}
      className="group/header sticky top-0 z-40 bg-surface transition-shadow duration-200 data-[scrolled=true]:shadow-float"
    >
      {children}
    </header>
  );
}

/** Nella hero: segnala alla navbar quando la ricerca grande non si vede più. Si toglie da solo uscendo dalla pagina. */
export function HeroSearchWatcher() {
  useEffect(() => {
    const hero = document.getElementById(HERO_SEARCH_ID);
    const root = document.documentElement;
    if (!hero) return;
    const offset = document.querySelector("header")?.offsetHeight ?? 72;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && entry.boundingClientRect.top < offset) root.dataset.heroSearch = "hidden";
        else delete root.dataset.heroSearch;
      },
      { rootMargin: `-${offset}px 0px 0px 0px` },
    );
    observer.observe(hero);
    return () => {
      observer.disconnect();
      delete root.dataset.heroSearch;
    };
  }, []);
  return null;
}

/** Ricerca compatta nella navbar (solo desktop, solo dopo la hero). Usa l'elenco dei comuni della hero. */
export function HeaderSearch() {
  return (
    <form
      action="/cerca"
      method="get"
      role="search"
      aria-label="Ricerca rapida"
      className="hidden min-w-0 flex-1 justify-center lg:hero-search-hidden:flex"
    >
      <div className="flex h-12 w-full max-w-xl header-search-in items-center rounded-full border border-line bg-surface pr-1.5 pl-4 focus-within:border-primary">
        <Search className="size-4 shrink-0 text-ink-2" aria-hidden />
        <label className="sr-only" htmlFor="ricerca-compatta-q">
          Di cosa hai bisogno?
        </label>
        <input
          id="ricerca-compatta-q"
          name="q"
          placeholder="Di cosa hai bisogno?"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-2.5 text-body-s text-ink placeholder:text-ink-3 focus:outline-none"
        />
        <span aria-hidden className="h-6 w-px bg-line" /> {/* taste-skill-ignore: separa i due campi del modulo */}
        <MapPin className="ml-3 size-4 shrink-0 text-ink-2" aria-hidden />
        <label className="sr-only" htmlFor="ricerca-compatta-dove">
          Comune
        </label>
        <input
          id="ricerca-compatta-dove"
          name="dove"
          list="comuni-veneto"
          placeholder="Comune"
          autoComplete="off"
          className="w-28 bg-transparent px-2 text-body-s text-ink placeholder:text-ink-3 focus:outline-none lg:w-36"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-body-s font-semibold text-on-brand transition-colors hover:bg-bosco-700 active:scale-[0.97]"
        >
          Trova <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}

type ExploreLink = { href: string; label: string; note?: string };

/** Menu "Esplora" della navbar: le due sezioni e le categorie dei professionisti. */
export function ExploreMenu({ sections, categories }: { sections: ExploreLink[]; categories: ExploreLink[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        root.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-[42px] items-center gap-1.5 rounded-full px-4 text-body-s text-ink-2 transition-colors hover:text-ink aria-expanded:text-ink"
      >
        Esplora
        <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      <div
        id={panelId}
        hidden={!open}
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        className="absolute top-full right-0 mt-2 w-[min(36rem,calc(100vw-2rem))] menu-in rounded-lg bg-surface p-3 shadow-float"
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col gap-1 rounded-md bg-page p-2">
            {sections.map((s) => (
              <Link key={s.href} href={s.href} className="group/link flex flex-col rounded-md px-3 py-2.5 transition-colors hover:bg-subtle">
                <span className="inline-flex items-center gap-1.5 text-body font-semibold text-ink">
                  {s.label}
                  <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-[transform,opacity] duration-200 group-hover/link:translate-x-0 group-hover/link:opacity-100" aria-hidden />
                </span>
                {s.note && <span className="text-body-s text-ink-2">{s.note}</span>}
              </Link>
            ))}
          </div>
          <div className="flex flex-col p-1">
            <p className="px-3 pt-2 pb-1 text-body-s font-semibold text-ink-2">Professionisti per categoria</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2">
              {categories.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="block rounded-md px-3 py-2 text-body-s text-ink transition-colors hover:bg-subtle hover:text-primary">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
