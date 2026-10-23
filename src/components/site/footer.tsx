import Link from "next/link";
import { Wordmark } from "./wordmark";

const COLUMNS = [
  {
    title: "Per te",
    links: [
      { href: "/trova-casa", label: "Trova Casa" },
      { href: "/trova-professionista", label: "Trova Professionista" },
      { href: "/come-funziona", label: "Come funziona" },
      { href: "/come-funziona#recensioni", label: "Recensioni verificate" },
    ],
  },
  {
    title: "Per i partner",
    links: [
      { href: "/per-i-professionisti", label: "Diventa partner" },
      { href: "/per-i-professionisti#piani", label: "Piani e prezzi" },
      { href: "/accedi", label: "Accedi all'Area Partner" },
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

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-brand text-on-brand-muted">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3">
          <Wordmark inverted />
          <p className="max-w-xs text-body-s">
            Agenzie, tecnici e artigiani verificati del Veneto. Confronta, scegli, fatti ricontattare.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title} className="flex flex-col gap-2.5">
            <h2 className="text-body-s font-semibold text-on-brand">{c.title}</h2>
            {c.links.map((l) => (
              <Link key={l.href} href={l.href} className="text-body-s hover:text-on-brand">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="border-t border-bosco-800">
        <p className="container-page py-5 text-caption">
          © 2026 geco (nome provvisorio) · Veneto, Italia · Stai parlando con un&apos;intelligenza artificiale quando usi
          l&apos;assistente geco.
        </p>
      </div>
    </footer>
  );
}
