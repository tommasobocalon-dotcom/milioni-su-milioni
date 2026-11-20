import { CookiePreferencesButton } from "@/components/site/consent";
import Link from "next/link";
import { Wordmark } from "./wordmark";

const COLUMNS = [
  {
    title: "Per te",
    links: [
      { href: "/trova-professionista", label: "Trova un professionista" },
      { href: "/trova-casa", label: "Trova un'agenzia" },
      { href: "/ispirazione", label: "Ispirazione" },
      { href: "/come-funziona", label: "Come funziona" },
      { href: "/chi-siamo", label: "Chi siamo" },
      { href: "/assistenza", label: "Assistenza" },
      { href: "/accedi?modo=registrati", label: "Crea un account" },
    ],
  },
  {
    title: "Per i professionisti",
    links: [
      { href: "/per-i-professionisti", label: "Diventa partner" },
      { href: "/per-i-professionisti#piani", label: "Piani e prezzi" },
      { href: "/registrazione-partner", label: "Registra la tua azienda" },
      { href: "/accedi/azienda", label: "Accedi all'Area Partner" },
    ],
  },
  {
    title: "Trasparenza",
    links: [
      { href: "/come-ordiniamo-i-risultati", label: "Come ordiniamo i risultati" },
      { href: "/come-ordiniamo-i-risultati#sponsorizzati", label: "Contenuti sponsorizzati" },
      { href: "/privacy", label: "Privacy" },
      { href: "/termini", label: "Termini" },
    ],
  },
];

/** Footer a colonne sul modello di Thumbtack, nei colori del brand. I crediti di foto e mappa stanno in fondo a Termini (20/11/2026). */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-brand text-salvia-200">
      <div className="container-page grid gap-12 pt-16 pb-12 md:grid-cols-2 md:pt-20 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-4">
          <Wordmark className="text-3xl text-on-brand" />
          <p className="max-w-xs text-body">Casa tua, in buone mani. Agenzie, tecnici e artigiani del Veneto.</p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title} className="flex flex-col gap-3">
            <h2 className="text-body font-bold text-on-brand">{c.title}</h2>
            {c.links.map((l) => (
              <Link key={l.href} href={l.href} className="self-start text-body transition-colors hover:text-on-brand hover:underline hover:underline-offset-4">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="border-t border-bosco-700">
        <div className="container-page flex flex-col gap-3 py-5 text-body-s md:flex-row md:items-start md:justify-between md:gap-8">
          <p>
            © 2026 GecoItalia · Veneto, Italia
            <CookiePreferencesButton className="ml-3 underline underline-offset-2 hover:text-on-brand" />
          </p>
        </div>
      </div>
    </footer>
  );
}
