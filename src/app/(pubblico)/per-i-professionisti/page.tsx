import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Geco } from "@/components/site/geco";
import { ButtonLink } from "@/components/ui/button";
import { getPlans } from "@/lib/data/plans";
import { formatEuro } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Per agenzie, studi tecnici e artigiani",
  description: "Ricevi richieste verificate dalla tua zona con un abbonamento fisso. Lead verificati con SMS, scheda gestita in autonomia.",
};

export default async function ForProfessionalsPage() {
  const plans = await getPlans();
  return (
    <>
      <section className="bg-brand text-on-brand">
        <div className="container-page grid items-center gap-8 py-14 md:grid-cols-[1fr_auto]">
          <div className="flex max-w-2xl flex-col gap-4">
            <p className="caps-label text-on-brand-muted">Per agenzie, studi tecnici e artigiani</p>
            <h1 className="font-display text-h1 md:text-display-l">Richieste vere dalla tua zona, a un costo che conosci</h1>
            <p className="text-body-l text-on-brand-muted">
              Un abbonamento fisso, mensile o annuale. Ogni richiesta è verificata con un SMS prima di arrivarti, e la tua scheda
              la gestisci tu: prezzi indicativi, portfolio, zone.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="#piani" variant="light">
                Scegli il piano
              </ButtonLink>
              <ButtonLink href="/accedi" variant="ghost" className="text-on-brand hover:bg-bosco-800">
                Sei già partner? Accedi
              </ButtonLink>
            </div>
          </div>
          <Geco outfit="partner" size={220} className="hidden md:block" />
        </div>
      </section>

      <section className="container-page grid gap-6 py-14 md:grid-cols-3">
        {[
          ["Lead verificati", "Il cliente conferma il numero con un SMS. I duplicati si annullano da soli e puoi segnalare un lead non valido entro 72 ore."],
          ["Costi prevedibili", "Paghi l'abbonamento in anticipo, con i lead del periodo inclusi. Oltre la quota decidi tu se usare i token."],
          ["Scheda in autonomia", "Descrizione, listino indicativo, portfolio e zone servite: aggiorni tutto quando vuoi, il geco ti suggerisce cosa migliorare."],
        ].map(([t, d]) => (
          <div key={t} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-6">
            <h2 className="text-h4 font-semibold">{t}</h2>
            <p className="text-body-s text-ink-2">{d}</p>
          </div>
        ))}
      </section>

      <section id="piani" className="container-page flex scroll-mt-24 flex-col gap-6 pb-16">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-h2">Piani</h2>
          <p className="text-body-s text-ink-2">Prezzi IVA esclusa. Con l&apos;annuale paghi 10 mesi invece di 12. Disdici quando vuoi, vale a fine periodo.</p>
        </div>
        <ul className="grid gap-6 lg:grid-cols-3">
          {plans.map((p) => {
            const featured = p.code === "media";
            return (
              <li key={p.id} className={cn("flex flex-col gap-4 rounded-xl border bg-surface p-6", featured ? "border-primary shadow-float" : "border-line")}>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-h2">{p.name}</h3>
                  {featured && <span className="rounded-full bg-brand-soft px-2.5 py-1 text-caption font-semibold text-brand">Il più scelto</span>}
                </div>
                <p>
                  <span className="font-display text-display-l">{formatEuro(Math.round(p.yearlyPriceCents / 12))}</span>
                  <span className="text-body-s text-ink-2"> /mese con l&apos;annuale</span>
                </p>
                <p className="text-body-s text-ink-2">
                  {formatEuro(p.yearlyPriceCents)} all&apos;anno, oppure {formatEuro(p.monthlyPriceCents)} al mese con il mensile
                </p>
                <ul className="flex flex-col gap-2 text-body-s">
                  {[
                    `${p.leadsIncluded} lead verificati al mese`,
                    `Fino a ${p.maxProvinces} ${p.maxProvinces === 1 ? "provincia" : "province"}`,
                    p.maxServices ? `${p.maxServices} servizi nel listino` : "Listino illimitato",
                    p.maxPortfolioItems ? `${p.maxPortfolioItems} elementi di portfolio` : "Portfolio illimitato",
                    `${p.maxUsers} ${p.maxUsers === 1 ? "utente" : "utenti"}`,
                    p.renewalTokens ? `${p.renewalTokens} token omaggio a ogni rinnovo` : null,
                    p.featuredSlots ? "Accesso ai posti \"In evidenza\" della zona" : null,
                  ]
                    .filter(Boolean)
                    .map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {t}
                      </li>
                    ))}
                </ul>
                <ButtonLink href="/area-partner/abbonamento" variant={featured ? "primary" : "secondary"} className="mt-auto">
                  Attiva {p.name}
                </ButtonLink>
              </li>
            );
          })}
        </ul>
        <p className="text-body-s text-ink-2">
          Sei già partner? Accedi e attiva il piano dall&apos;Area Partner, con pagamento sicuro su Stripe (carta o addebito SEPA).
          La registrazione online dei nuovi partner arriva a breve: nel frattempo l&apos;account lo apre il commerciale della tua zona.
        </p>
      </section>
    </>
  );
}
