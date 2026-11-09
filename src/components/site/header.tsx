import Link from "next/link";
import { Menu } from "lucide-react";
import { getCategories } from "@/lib/data/catalog";
import { ExploreMenu, HeaderFrame, HeaderSearch } from "./header-client";
import { Wordmark } from "./wordmark";

const SECTIONS = [
  { href: "/trova-professionista", label: "Trova un professionista", note: "Tecnici e artigiani verificati, con prezzi indicativi" },
  { href: "/trova-casa", label: "Trova un'agenzia", note: "Comprare, vendere, affittare o far valutare casa" },
  { href: "/ispirazione", label: "Ispirazione", note: "Lavori veri delle aziende, per farti un'idea" },
  { href: "/come-funziona", label: "Come funziona", note: "Ordinamento, recensioni e contenuti sponsorizzati" },
];

/** Navbar sul modello di Thumbtack: marchio a sinistra, Esplora, Area clienti e Area aziende a destra. */
export async function SiteHeader() {
  const categories = (await getCategories())
    .filter((c) => c.partnerType !== "agency")
    .map((c) => ({ href: `/trova-professionista?categoria=${c.slug}`, label: c.pluralName }));

  return (
    <HeaderFrame>
      <div className="flex h-[72px] items-center gap-4 px-4 lg:gap-6">
        <Wordmark className="text-xl" />
        <HeaderSearch />
        <nav aria-label="Principale" className="ml-auto hidden items-center md:flex">
          <div className="flex items-center lg:hero-search-hidden:max-xl:hidden">
            <ExploreMenu sections={SECTIONS} categories={categories} />
          </div>
          <Link
            href="/accedi"
            className="ml-2 inline-flex h-[42px] items-center rounded-full px-5 text-body-s font-bold text-ink transition-colors hover:bg-subtle"
          >
            Area clienti
          </Link>
          <Link
            href="/accedi/azienda"
            className="ml-4 inline-flex h-[42px] items-center rounded-full bg-subtle px-5 text-body-s font-bold text-primary transition-[background-color,transform] duration-150 hover:bg-brand-soft active:scale-[0.97]"
          >
            Area aziende
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
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Link href="/accedi" className="inline-flex h-11 items-center justify-center rounded-full text-body font-semibold text-primary hover:bg-subtle">
                Area clienti
              </Link>
              <Link
                href="/accedi/azienda"
                className="inline-flex h-11 items-center justify-center rounded-full bg-subtle text-body font-semibold text-primary hover:bg-brand-soft"
              >
                Area aziende
              </Link>
            </div>
          </div>
        </details>
      </div>
    </HeaderFrame>
  );
}
