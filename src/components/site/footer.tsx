import Link from "next/link";
import { CATEGORY_PHOTOS } from "@/lib/data/category-photos";
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
      { href: "/come-funziona#recensioni", label: "Recensioni verificate" },
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
      { href: "/come-funziona#ordinamento", label: "Come ordiniamo i risultati" },
      { href: "/come-funziona#sponsorizzati", label: "Contenuti sponsorizzati" },
      { href: "/privacy", label: "Privacy" },
      { href: "/termini", label: "Termini" },
    ],
  },
];

const ISTAT_CREDIT = {
  title: "Confini delle province del Veneto",
  author: "ISTAT",
  license: "CC BY 3.0",
  licenseUrl: "https://creativecommons.org/licenses/by/3.0/it/",
  page: "https://www.istat.it/it/archivio/210584",
};

/** Footer a colonne sul modello di Thumbtack, nei colori del brand, con i crediti di foto e mappa. */
export function SiteFooter() {
  const credits = [...new Map(Object.values(CATEGORY_PHOTOS).map((p) => [p.credit.page, p.credit])).values(), ISTAT_CREDIT];
  return (
    <footer className="mt-auto bg-brand text-salvia-200">
      <div className="container-page grid gap-12 pt-16 pb-12 md:grid-cols-2 md:pt-20 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-4">
          <Wordmark className="text-3xl text-on-brand" />
          <p className="max-w-xs text-body">Casa tua, in buone mani. Agenzie, tecnici e artigiani verificati del Veneto.</p>
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
      <div className="bg-bosco-900">
        <div className="container-page flex flex-col gap-3 py-5 text-body-s md:flex-row md:items-start md:justify-between md:gap-8">
          <p>© 2026 GecoItalia · Veneto, Italia</p>
        </div>
        <details className="container-page pb-5 text-body-s">
          <summary className="cursor-pointer self-start hover:text-on-brand">Crediti di foto e mappe</summary>
          <ul className="mt-3 flex flex-col gap-1.5">
            {credits.map((cr) => (
              <li key={cr.page}>
                <a href={cr.page} className="underline underline-offset-2 hover:text-on-brand" rel="noopener" target="_blank">
                  “{cr.title}”
                </a>
                {cr.author ? ` di ${cr.author}` : ""},{" "}
                <a href={cr.licenseUrl} className="underline underline-offset-2 hover:text-on-brand" rel="noopener license" target="_blank">
                  {cr.license}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </footer>
  );
}
