import Link from "next/link";
import { Menu } from "lucide-react";
import { getCategories } from "@/lib/data/catalog";
import { ExploreMenu, HeaderFrame, HeaderSearch } from "./header-client";
import { Wordmark } from "./wordmark";

const SECTIONS = [
  { href: "/trova-professionista", label: "Trova un professionista", note: "Tecnici e artigiani verificati, con prezzi indicativi" },
  { href: "/trova-casa", label: "Trova un'agenzia", note: "Comprare, vendere, affittare o far valutare casa" },
  { href: "/come-funziona", label: "Come funziona", note: "Ordinamento, recensioni e contenuti sponsorizzati" },
];

/** Navbar sul modello di Thumbtack: marchio a sinistra, Esplora, Sei un professionista?, Accedi e Registrati a destra. */
export async function SiteHeader() {
  const categories = (await getCategories())
    .filter((c) => c.partnerType !== "agency")
    .map((c) => ({ href: `/trova-professionista?categoria=${c.slug}`, label: c.pluralName }));

  return (
    <HeaderFrame>
      <div className="container-page flex h-[72px] items-center gap-4 lg:gap-6">
        <Wordmark />
        <HeaderSearch />
        <nav aria-label="Principale" className="ml-auto hidden items-center md:flex">
          <div className="flex items-center lg:hero-search-hidden:max-xl:hidden">
            <ExploreMenu sections={SECTIONS} categories={categories} />
            <Link
              href="/per-i-professionisti"
              className="inline-flex h-11 items-center rounded-full px-4 text-body text-ink-2 transition-colors hover:text-ink"
            >
              Sei un professionista?
            </Link>
          </div>
          <Link
            href="/accedi"
            className="inline-flex h-11 items-center rounded-full px-4 text-body font-semibold text-primary transition-colors hover:bg-subtle"
          >
            Accedi
          </Link>
          <Link
            href="/accedi/azienda"
            className="inline-flex h-11 items-center rounded-full px-4 text-body text-ink-2 transition-colors hover:text-ink"
          >
            Area aziende
          </Link>
          <Link
            href="/accedi?modo=registrati"
            className="ml-1 inline-flex h-11 items-center rounded-full bg-subtle px-5 text-body-s font-bold text-primary transition-[background-color,transform] duration-150 hover:bg-brand-soft active:scale-[0.97]"
          >
            Registrati
          </Link>
        </nav>

        {/* Menu mobile senza JavaScript */}
        <details className="relative ml-auto md:hidden">
          <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full hover:bg-subtle [&::-webkit-details-marker]:hidden">
            <Menu className="size-6" aria-hidden />
            <span className="sr-only">Apri il menu</span>
          </summary>
          <div className="absolute right-0 mt-2 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-1 rounded-lg bg-surface p-2 shadow-float">
            {SECTIONS.map((s) => (
              <Link key={s.href} href={s.href} className="rounded-md px-3 py-2.5 text-body font-semibold hover:bg-subtle">
                {s.label}
              </Link>
            ))}
            <Link href="/accedi/azienda" className="rounded-md px-3 py-2.5 text-body text-ink-2 hover:bg-subtle">
              Area aziende
            </Link>
            <Link href="/per-i-professionisti" className="rounded-md px-3 py-2.5 text-body text-ink-2 hover:bg-subtle">
              Sei un professionista?
            </Link>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Link href="/accedi" className="inline-flex h-11 items-center justify-center rounded-full text-body font-semibold text-primary hover:bg-subtle">
                Accedi
              </Link>
              <Link
                href="/accedi?modo=registrati"
                className="inline-flex h-11 items-center justify-center rounded-full bg-subtle text-body-s font-bold text-primary hover:bg-brand-soft"
              >
                Registrati
              </Link>
            </div>
          </div>
        </details>
      </div>
    </HeaderFrame>
  );
}
