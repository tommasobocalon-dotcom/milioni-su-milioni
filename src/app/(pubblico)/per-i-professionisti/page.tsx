import type { Metadata } from "next";
import Image from "next/image";
import { BadgeCheck, Check, Inbox, PhoneCall, Search } from "lucide-react";
import { Geco } from "@/components/site/geco";
import { PlanPicker, type PlanCard } from "@/components/site/pro/plan-picker";
import { ButtonLink } from "@/components/ui/button";
import { CATEGORY_PHOTOS } from "@/lib/data/category-photos";
import { getPlans } from "@/lib/data/plans";
import { formatEuro } from "@/lib/domain/format";
import { REPORT_WINDOW_HOURS, TOKEN_COST_PER_LEAD, UNLOCK_WINDOW_HOURS } from "@/lib/domain/lead-rules";
import { BOOST_OPTIONS, TOKEN_PACKAGES } from "@/lib/domain/offers";

export const metadata: Metadata = {
  title: "Per artigiani, tecnici e agenzie",
  description:
    "Ricevi richieste di clienti della tua zona, con il numero verificato da un SMS. Abbonamento fisso mensile o annuale, crediti solo se servono.",
};

const STEPS = [
  { icon: Search, title: "Il cliente ti trova", text: "Cerca il lavoro e il comune e vede la tua scheda con prezzi indicativi, foto e recensioni." },
  { icon: BadgeCheck, title: "Conferma il numero", text: "Prima di inviarti la richiesta conferma il suo telefono con un codice via SMS." },
  { icon: Inbox, title: "Ricevi la richiesta", text: "Per email e nell'Area aziende: che lavoro, dove, quando e a che ora chiamarlo." },
  { icon: PhoneCall, title: "Lo chiami tu", text: "Nella fascia oraria che ha scelto. A lavoro finito può lasciarti una recensione." },
];

const FAQ = [
  {
    q: "Cosa succede quando finisco le richieste del piano?",
    a: `Le richieste in più sono "extra": vedi il lavoro e il comune, ma il numero resta nascosto per ${UNLOCK_WINDOW_HOURS} ore. Se ti interessa la sblocchi con ${TOKEN_COST_PER_LEAD} crediti. Se non la sblocchi non paghi niente.`,
  },
  {
    q: "E se una richiesta non è valida?",
    a: `La segnali entro ${REPORT_WINDOW_HOURS} ore (numero inesistente, fuori zona, lavoro che non fai, spam). Se la segnalazione è accolta non ti viene conteggiata.`,
  },
  {
    q: "Lo stesso cliente mi scrive due volte: pago due volte?",
    a: "No. Se lo stesso cliente ti rimanda la stessa richiesta entro 30 giorni, conta una volta sola.",
  },
  {
    q: "Chi paga di più compare più in alto?",
    a: 'No. L\'ordine dipende da distanza, completezza della scheda, recensioni e velocità di risposta. Chi si mette in evidenza compare in cima, ma sempre con la scritta "Sponsorizzato".',
  },
  {
    q: "Come pago? Posso disdire?",
    a: "Paghi in anticipo online, con carta o addebito SEPA. Disdici quando vuoi dall'Area aziende: il piano resta attivo fino alla fine del periodo pagato.",
  },
  {
    q: "Quanto ci metto a partire?",
    a: "Pochi minuti: crei l'account, inserisci i dati dell'attività (partita IVA, codice SDI o PEC), scegli il piano e paghi. La scheda compare appena il pagamento è confermato.",
  },
];

function planLines(p: Awaited<ReturnType<typeof getPlans>>[number]): string[] {
  return [
    `${p.leadsIncluded} richieste di clienti al mese`,
    `Fino a ${p.maxProvinces} ${p.maxProvinces === 1 ? "provincia" : "province"}`,
    p.maxServices ? `${p.maxServices} prezzi nel listino` : "Listino senza limiti",
    p.maxPortfolioItems ? `${p.maxPortfolioItems} foto di lavori` : "Foto di lavori senza limiti",
    `${p.maxUsers} ${p.maxUsers === 1 ? "utente" : "utenti"}`,
    p.renewalTokens ? `${p.renewalTokens} crediti in omaggio a ogni rinnovo` : null,
    p.featuredSlots ? "Posti in evidenza nella tua zona" : null,
  ].filter((l): l is string => !!l);
}

export default async function ForProfessionalsPage() {
  const plans: PlanCard[] = (await getPlans()).map((p) => ({
    code: p.code,
    name: p.name,
    monthlyPriceCents: p.monthlyPriceCents,
    yearlyPriceCents: p.yearlyPriceCents,
    lines: planLines(p),
  }));
  const photo = CATEGORY_PHOTOS.ristrutturazioni;

  return (
    <>
      {/* Testo a sinistra, foto a destra (sul telefono la foto va sotto). */}
      <section className="bg-brand text-on-brand">
        <div className="container-page grid items-center gap-10 py-12 md:py-16 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-h1 md:text-display-xl">Trova nuovi clienti nella tua zona</h1>
            <p className="text-body-l text-on-brand-muted">
              Per artigiani, tecnici e agenzie del Veneto. Ricevi richieste di persone che cercano proprio il tuo lavoro, con il
              numero già verificato.
            </p>
            <ul className="flex flex-col gap-2 text-body">
              {["Clienti verificati con un SMS", "Abbonamento fisso, sai sempre quanto spendi", "Nessun vincolo: disdici quando vuoi"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-5 shrink-0 text-salvia-300" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/registrazione-partner" variant="light">
                Registra la tua attività
              </ButtonLink>
              <ButtonLink href="#piani" variant="ghost" className="text-on-brand hover:bg-bosco-800">
                Vedi i prezzi
              </ButtonLink>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <Image src={photo.src} alt={photo.alt} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
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
            <p className="text-body text-ink-2">Ogni piano include un numero di richieste al mese. Con l&apos;annuale paghi 10 mesi invece di 12.</p>
          </div>
          <PlanPicker plans={plans} />

          <div className="grid gap-6 rounded-lg border border-line bg-surface p-6 md:grid-cols-[1fr_1.2fr] md:p-8">
            <div className="flex flex-col gap-2">
              <h3 className="text-h3 font-semibold">Ti servono più richieste? Usa i crediti</h3>
              <p className="text-body-s text-ink-2">
                Li compri solo se servono e valgono 12 mesi. Una richiesta extra costa {TOKEN_COST_PER_LEAD} crediti; con{" "}
                {BOOST_OPTIONS[0].tokens} crediti metti la scheda in evidenza per {BOOST_OPTIONS[0].days} giorni.
              </p>
            </div>
            <ul className="grid grid-cols-3 gap-3">
              {TOKEN_PACKAGES.map((p) => (
                <li key={p.code} className="flex flex-col items-center gap-1 rounded-md bg-subtle p-4 text-center">
                  <span className="font-display text-h2 tabular-nums">{p.tokens}</span>
                  <span className="text-caption text-ink-2">crediti</span>
                  <span className="text-body-s font-semibold">{formatEuro(p.priceCents)}</span>
                </li>
              ))}
            </ul>
          </div>
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
          <Geco outfit="partner" size={96} />
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
