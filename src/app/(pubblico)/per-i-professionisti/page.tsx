import type { Metadata } from "next";
import Image from "next/image";
import { BadgeCheck, Check, Inbox, PhoneCall, Search } from "lucide-react";
import { PlanPicker, type PlanCard } from "@/components/site/pro/plan-picker";
import { ButtonLink } from "@/components/ui/button";
import { getFreePlanOpen, getPlansWithPromo } from "@/lib/data/plans";
import { FREE_LEADS } from "@/lib/domain/free-plan";
import { REPORT_WINDOW_HOURS } from "@/lib/domain/lead-rules";
import { planFeatures } from "@/lib/domain/plan-features";

export const metadata: Metadata = {
  alternates: { canonical: "/per-i-professionisti" },
  title: "Per artigiani, tecnici e agenzie",
  description:
    "Richieste di clienti della tua zona gratis e illimitate, confermate dal cliente via email. Tre piani, con le promo di lancio.",
};

const STEPS = [
  { icon: Search, title: "Il cliente ti trova", text: "Cerca il lavoro e il comune e vede la tua scheda con prezzi indicativi e foto dei lavori." },
  { icon: BadgeCheck, title: "Conferma la richiesta", text: "Prima di inviartela conferma la richiesta con un codice che riceve via email." },
  { icon: Inbox, title: "Ricevi la richiesta", text: "Per email e nell'Area aziende: che lavoro, dove, quando e a che ora chiamarlo." },
  { icon: PhoneCall, title: "Lo chiami tu", text: "Nella fascia oraria che ha scelto, quando sai già cosa gli serve." },
];

/** Domande frequenti: finché il piano gratuito di lancio è aperto, pagamento e partenza lo dicono. */
const faq = (free: boolean) => [
  ...(free
    ? [
        {
          q: "Posso provare senza pagare?",
          a: `Sì. Per il lancio la tua scheda è gratis, con le funzioni del piano Base, finché non ricevi ${FREE_LEADS} richieste. Poi, per restare nei risultati e ricevere altre richieste, scegli un piano: le promo restano valide anche per te.`,
        },
      ]
    : []),
  {
    q: "Quanto pago per ogni richiesta?",
    a: "Niente. Le richieste dei clienti sono gratis e illimitate con tutti i piani: paghi solo l'abbonamento.",
  },
  {
    q: "E se una richiesta non è valida?",
    a: `La segnali entro ${REPORT_WINDOW_HOURS} ore (numero inesistente, fuori zona, lavoro che non fai, spam). Ci aiuta a tenere fuori numeri falsi e spam.`,
  },
  {
    q: "Chi paga di più compare più in alto?",
    a: 'Sì, ed è dichiarato. Nella tua zona compaiono prima i Premium, poi i Normal, poi i Base; con un boost (24 ore 15 €, 48 ore 25 €, + IVA) sali in cima al tuo gruppo. Il piano Base non può comprare pacchetti. Tra pari grado l\'ordine ruota. I posti a pagamento hanno sempre la scritta "Sponsorizzato".',
  },
  {
    q: "Come pago? Posso disdire?",
    a: free
      ? "Se scegli subito un piano, i primi 7 giorni sono gratis: inserisci la carta e se disdici prima non paghi nulla. Se invece parti dal piano gratuito paghi da quando scegli il piano. Si paga in anticipo, con carta o addebito SEPA. Disdici quando vuoi dall'Area aziende: il piano resta attivo fino alla fine del periodo pagato."
      : "I primi 7 giorni sono gratis: inserisci la carta e se disdici prima non paghi nulla. Poi paghi in anticipo, con carta o addebito SEPA. Disdici quando vuoi dall'Area aziende: il piano resta attivo fino alla fine del periodo pagato.",
  },
  {
    q: "Quanto ci metto a partire?",
    a: free
      ? "Pochi minuti: crei l'account, inserisci i dati dell'attività (partita IVA, codice SDI o PEC) e scegli se partire gratis o con un piano. La scheda compare quando il piano è attivo e abbiamo verificato i dati dell'azienda."
      : "Pochi minuti: crei l'account, inserisci i dati dell'attività (partita IVA, codice SDI o PEC), scegli il piano e paghi. La scheda compare quando il pagamento è confermato e abbiamo verificato i dati dell'azienda.",
  },
];

export default async function ForProfessionalsPage() {
  const free = await getFreePlanOpen();
  const FAQ = faq(free);
  const plans: PlanCard[] = (await getPlansWithPromo()).map((p) => ({
    code: p.code,
    name: p.name,
    monthlyPriceCents: p.monthlyPriceCents,
    yearlyPriceCents: p.yearlyPriceCents,
    promo: p.promo,
    lines: planFeatures(p.code),
  }));

  return (
    <>
      {/* Testo a sinistra, foto a destra (sul telefono la foto va sotto). */}
      <section className="bg-brand text-on-brand">
        <div className="container-page grid items-center gap-10 py-12 md:py-16 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-h1 md:text-display-xl">Trova nuovi clienti nella tua zona</h1>
            <p className="text-body-l text-on-brand-muted">
              Per artigiani, tecnici e agenzie del Veneto. Ricevi richieste di persone che cercano proprio il tuo lavoro, già
              confermate dal cliente.
            </p>
            <ul className="flex flex-col gap-2 text-body">
              {[
                "Richieste dei clienti gratis e illimitate",
                "Richieste confermate dal cliente via email",
                free ? `Per il lancio parti gratis, fino a ${FREE_LEADS} richieste` : "7 giorni di prova gratis, poi disdici quando vuoi",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-5 shrink-0 text-salvia-300" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/registrazione-partner" variant="light">
                Registra la tua attività
              </ButtonLink>
              <ButtonLink href="#piani" variant="ghost" className="text-on-brand hover:bg-bosco-700">
                Vedi i prezzi
              </ButtonLink>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <Image
              src="/foto/per-i-professionisti-3.jpg"
              alt="Professionista che esamina un progetto con una coppia attorno a un tavolo"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="come-funziona" className="container-page py-16 md:py-20">
        <h2 id="come-funziona" className="font-display text-h2 md:text-h1">
          Come funziona
        </h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.title} className="flex flex-col gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-brand-soft text-primary">
                <s.icon className="size-6" aria-hidden />
              </span>
              <h3 className="text-h4 font-semibold">{s.title}</h3>
              <p className="text-body-s text-ink-2">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="piani" aria-labelledby="piani-titolo" className="scroll-mt-20 bg-subtle py-16 md:py-20">
        <div className="container-page flex flex-col gap-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-2 text-center">
            <h2 id="piani-titolo" className="font-display text-h2 md:text-h1">
              Scegli il tuo piano
            </h2>
            <p className="text-body text-ink-2">Con tutti i piani le richieste dei clienti sono gratis e illimitate. I primi 7 giorni non paghi nulla.</p>
          </div>
          {free && (
            <div className="flex flex-col gap-4 rounded-lg border-2 border-primary bg-surface p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex max-w-2xl flex-col gap-1">
                <h3 className="text-h3 font-semibold">Per il lancio, parti gratis</h3>
                <p className="text-body-s text-ink-2">
                  La tua scheda non costa nulla finché non ricevi {FREE_LEADS} richieste, con le funzioni del piano Base e
                  senza carta. Poi scegli il piano che preferisci, sempre con le promo qui sotto.
                </p>
              </div>
              <ButtonLink href="/registrazione-partner" className="shrink-0">
                Parti gratis
              </ButtonLink>
            </div>
          )}
          <PlanPicker plans={plans} />

        </div>
      </section>

      <section aria-labelledby="domande" className="container-page py-16 md:py-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <h2 id="domande" className="font-display text-h2 md:text-h1">
            Domande frequenti
          </h2>
          <div className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
            {FAQ.map((f) => (
              <details key={f.q} name="faq" className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-body font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="text-h3 leading-none text-primary transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-body-s text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-soft">
        <div className="container-page flex flex-col items-start gap-6 py-12 md:flex-row md:items-center">
          <div className="flex flex-1 flex-col gap-1">
            <h2 className="font-display text-h2">Pronto a ricevere richieste?</h2>
            <p className="text-body text-neutro-700">Registri l&apos;attività in pochi minuti e scegli il piano.</p>
          </div>
          <ButtonLink href="/registrazione-partner">Registra la tua attività</ButtonLink>
        </div>
      </section>
    </>
  );
}
