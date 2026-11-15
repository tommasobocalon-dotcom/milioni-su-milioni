import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Award, Star } from "lucide-react";
import { ScrollSteps } from "@/components/site/scroll-steps";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { HOW_PHOTOS } from "@/lib/data/category-photos";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Come funziona",
  description:
    "Come trovi agenzie, tecnici e artigiani della tua zona e come ordiniamo i risultati. Contenuti sponsorizzati sempre etichettati.",
};

const STEPS = [
  {
    title: "Descrivi il lavoro",
    text: "Scrivi cosa ti serve e in quale comune, per esempio «rifare il bagno a Mestre».",
    photo: HOW_PHOTOS.search,
  },
  {
    title: "Confronta chi lavora in zona",
    text: "Vedi le aziende della tua zona, con i servizi e i lavori che hanno già fatto.",
    photo: HOW_PHOTOS.compare,
  },
  {
    title: "Richiedi un contatto",
    text: "Rispondi a poche domande e conferma con il codice che ricevi via email.",
    photo: HOW_PHOTOS.request,
  },
  {
    title: "Vieni richiamato",
    text: "L'azienda ti telefona nella fascia oraria che hai scelto.",
    photo: HOW_PHOTOS.done,
  },
];

/** I gradi della classifica, con gli stessi colori delle schede nei risultati (PartnerCard). */
const TIERS = [
  {
    plan: "Partner Elite",
    note: "in evidenza",
    premium: true,
    boosted: true,
    width: "w-full",
  },
  {
    plan: "Partner Elite",
    note: "",
    premium: true,
    boosted: false,
    width: "w-[92%]",
  },
  {
    plan: "Partner Pro",
    note: "in evidenza",
    premium: false,
    boosted: true,
    width: "w-[84%]",
  },
  {
    plan: "Partner Pro",
    note: "",
    premium: false,
    boosted: false,
    width: "w-[76%]",
  },
  {
    plan: "Altre aziende",
    note: "",
    premium: false,
    boosted: false,
    width: "w-[68%]",
  },
];

const SPONSORED = [
  {
    figure: "24 o 48 ore",
    title: "In evidenza nella ricerca",
    text: "L'azienda sale tra quelle del suo gruppo nella sua categoria e provincia. Il riquadro grande in cima va a un Partner Elite, a rotazione.",
  },
  {
    figure: "7 o 30 giorni",
    title: "Logo in Home",
    text: 'Il logo entra nella fascia "Aziende in evidenza", dove i loghi scorrono in un ordine che cambia a ogni visita.',
  },
  {
    figure: "30 giorni",
    title: "Altri comuni, uno per uno",
    text: "L'azienda compare anche nelle ricerche di altri comuni del Veneto, con lo stesso ordine delle altre.",
  },
];

/**
 * "Come funziona" rifatta sul modello delle pagine "how it works" dei siti Awwwards (novembre 2026): Venezia a tutto
 * schermo con il titolo grande, passi in una striscia di foto che scorre in orizzontale con la pagina, classifica
 * disegnata come una scala con i colori delle schede, sponsorizzati con la durata in grande, chiusura su foto a tutta
 * larghezza. Foto da Pexels (HOW_PHOTOS). Le ancore #ordinamento e #sponsorizzati restano.
 */
export default function HowItWorksPage() {
  return (
    <>
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-brand text-on-brand">
        <Image
          src={HOW_PHOTOS.hero.src}
          alt={HOW_PHOTOS.hero.alt}
          fill
          priority
          sizes="100vw"
          className="hero-drift -z-10 object-cover"
        />
        {/* Velatura per leggere il titolo sulla foto. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-bosco-900/55"
        />
        <div className="container-page flex flex-col items-center gap-8 py-24 text-center">
          <h1 className="hero-rise font-display text-[3.25rem] leading-[0.95] tracking-[-0.04em] sm:text-[5rem] lg:text-[9rem]">
            Come funziona
          </h1>
          <div className="hero-rise flex flex-col items-center gap-8 [animation-delay:90ms]">
            <p className="max-w-[40rem] text-body-l md:text-[1.375rem] md:leading-[1.5]">
              Trovi agenzie, tecnici e artigiani della tua zona, guardi i lavori
              che hanno già svolto e chiedi di essere richiamato da chi ti
              interessa.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink
                href="/trova-professionista"
                variant="light"
                className="group"
              >
                Inizia a cercare
                <ArrowRight
                  className="size-5 transition-transform motion-safe:group-hover:translate-x-1"
                  aria-hidden
                />
              </ButtonLink>
              <a
                href="#ordinamento"
                className="inline-flex h-11 items-center px-2 font-semibold text-on-brand underline-offset-4 hover:underline"
              >
                Come ordiniamo i risultati
              </a>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="per-chi-cerca" className="bg-page">
        <ScrollSteps
          steps={STEPS}
          heading={
            <h2
              id="per-chi-cerca"
              className="text-center font-display text-h1 md:text-display-l"
            >
              Per chi cerca
            </h2>
          }
        />
      </section>

      <section
        id="ordinamento"
        aria-labelledby="ordinamento-titolo"
        className="scroll-mt-20 bg-surface py-24 md:py-36"
      >
        <div className="container-page flex flex-col gap-12 md:gap-16">
          <h2
            data-reveal
            id="ordinamento-titolo"
            className="text-center font-display text-h1 md:text-display-l"
          >
            Come ordiniamo i risultati
          </h2>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
            <div data-reveal className="flex flex-col gap-5">
              <p className="text-body-l">
                Mostriamo solo le aziende che lavorano nella categoria e nella
                zona che cerchi. Poi vengono prima i Partner Elite, poi i
                Partner Pro, poi le altre aziende; dentro ogni gruppo salgono
                quelle in evidenza.
              </p>
              <p className="text-body">
                Tra aziende dello stesso gruppo l&apos;ordine cambia da un
                visitatore all&apos;altro, così nessuna resta sempre prima. Se
                preferisci, puoi ordinare tu i risultati per distanza.
              </p>
            </div>

            <ol
              className="flex flex-col gap-3"
              aria-label="Ordine dei risultati, dal primo all'ultimo"
            >
              {TIERS.map((t, i) => (
                <li
                  key={`${t.plan}-${t.note}`}
                  data-reveal
                  style={
                    { "--reveal-shift": `${i * 4}%` } as React.CSSProperties
                  }
                  className={cn(
                    "flex min-h-20 items-center gap-4 rounded-lg px-5 py-4 transition-transform duration-300 motion-safe:hover:-translate-y-0.5",
                    t.width,
                    t.premium
                      ? t.boosted
                        ? "bg-lavanda-300"
                        : "bg-tertiary"
                      : t.plan === "Partner Pro"
                        ? t.boosted
                          ? "bg-brand-soft/80"
                          : "bg-brand-soft/40"
                        : "border border-line bg-page",
                  )}
                >
                  <span
                    aria-hidden
                    className="w-10 shrink-0 font-display text-h1 leading-none text-primary"
                  >
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      {t.premium ? (
                        <Star
                          className="size-4 fill-ambra-500 text-ambra-500"
                          aria-hidden
                        />
                      ) : t.plan === "Partner Pro" ? (
                        <Award className="size-4 text-primary" aria-hidden />
                      ) : null}
                      {t.plan}
                    </span>
                    {t.note && (
                      <span className="text-body-s text-ink-2">{t.note}</span>
                    )}
                  </span>
                  {t.boosted && (
                    <Badge
                      kind="sponsored"
                      className="hidden h-7 bg-surface px-2.5 text-body-s font-semibold sm:inline-flex"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section
        id="sponsorizzati"
        aria-labelledby="sponsorizzati-titolo"
        className="scroll-mt-20 bg-brand-soft py-24 md:py-36"
      >
        <div className="container-page flex flex-col gap-14">
          <div
            data-reveal
            className="flex flex-col items-center gap-4 text-center"
          >
            <h2
              id="sponsorizzati-titolo"
              className="font-display text-h1 md:text-display-l"
            >
              Contenuti sponsorizzati
            </h2>
            <p className="max-w-[44rem] text-body-l">
              I posti in evidenza li riconosci sempre dalla scritta{" "}
              <Badge
                kind="sponsored"
                className="mx-0.5 h-7 translate-y-[-2px] bg-surface px-2.5 text-body-s font-semibold"
              />
              , anche sui lavori in evidenza nella pagina Ispirazione.
            </p>
          </div>
          <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
            {SPONSORED.map((s, i) => (
              <li
                key={s.title}
                data-reveal
                style={{ "--reveal-shift": `${i * 5}%` } as React.CSSProperties}
                className="flex flex-col gap-3 rounded-lg bg-surface p-6 md:p-8"
              >
                <p className="font-display text-[2.5rem] leading-[1.05] tracking-[-0.03em] lg:text-[3rem]">
                  {s.figure}
                </p>
                <h3 className="text-h3 font-semibold">{s.title}</h3>
                <p className="text-body text-ink-2">{s.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="inizia"
        className="relative isolate overflow-hidden bg-brand text-on-brand"
      >
        <Image
          src={HOW_PHOTOS.newHome.src}
          alt={HOW_PHOTOS.newHome.alt}
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-bosco-900/65" />
        <div className="container-page flex min-h-[36rem] flex-col items-center justify-center gap-6 py-24 md:min-h-[44rem]">
          <div
            data-reveal
            className="flex max-w-[40rem] flex-col items-center gap-6 text-center"
          >
            <h2 id="inizia" className="font-display text-h1 md:text-display-l">
              Trova chi lavora vicino a te
            </h2>
            <p className="text-body-l">
              La richiesta di contatto non ti impegna a niente.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink
                href="/trova-professionista"
                variant="light"
                className="group"
              >
                Trova un professionista
                <ArrowRight
                  className="size-5 transition-transform motion-safe:group-hover:translate-x-1"
                  aria-hidden
                />
              </ButtonLink>
              <ButtonLink
                href="/trova-casa"
                variant="light"
                className="bg-transparent text-on-brand ring-1 ring-on-brand hover:bg-on-brand/10"
              >
                Trova un&apos;agenzia
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
