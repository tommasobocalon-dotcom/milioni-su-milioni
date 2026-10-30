import Link from "next/link";
import { Menu } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "./wordmark";

const NAV = [
  { href: "/trova-casa", label: "Trova Casa" },
  { href: "/trova-professionista", label: "Trova Professionista" },
  { href: "/confronta-prezzi", label: "Confronta prezzi" },
  { href: "/vicino-a-te", label: "Vicino a te" },
  { href: "/come-funziona", label: "Come funziona" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Wordmark />
        <nav aria-label="Principale" className="hidden items-center gap-6 xl:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-body-s font-semibold text-ink hover:text-primary">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 xl:flex">
          <Link href="/accedi" className="text-body-s font-semibold text-primary hover:underline">
            Accedi
          </Link>
          <Link href="/accedi/azienda" className="text-body-s font-semibold text-primary hover:underline">
            Area aziende
          </Link>
          <ButtonLink href="/per-i-professionisti" size="s">
            Sei un professionista?
          </ButtonLink>
        </div>
        {/* Menu mobile senza JavaScript */}
        <details className="relative xl:hidden">
          <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md hover:bg-subtle [&::-webkit-details-marker]:hidden">
            <Menu className="size-6" aria-hidden />
            <span className="sr-only">Apri il menu</span>
          </summary>
          <div className="absolute right-0 mt-2 flex w-64 flex-col gap-1 rounded-lg border border-line bg-surface p-2 shadow-float">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-2.5 text-body font-semibold hover:bg-subtle">
                {n.label}
              </Link>
            ))}
            <Link href="/accedi" className="rounded-md px-3 py-2.5 text-body font-semibold text-primary hover:bg-subtle">
              Accedi
            </Link>
            <Link href="/accedi/azienda" className="rounded-md px-3 py-2.5 text-body font-semibold text-primary hover:bg-subtle">
              Area aziende
            </Link>
            <ButtonLink href="/per-i-professionisti" size="s" className="mt-1">
              Sei un professionista?
            </ButtonLink>
          </div>
        </details>
      </div>
    </header>
  );
}
