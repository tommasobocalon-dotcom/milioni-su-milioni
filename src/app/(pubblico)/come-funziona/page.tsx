import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ScrollSteps } from "@/components/site/scroll-steps";
import { ButtonLink } from "@/components/ui/button";
import { HOW_PHOTOS } from "@/lib/data/category-photos";

export const metadata: Metadata = {
  alternates: { canonical: "/come-funziona" },
  title: "Come funziona",
  description:
    "Come trovi agenzie, tecnici e artigiani della tua zona e chiedi di essere richiamato.",
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

/**
 * "Come funziona" rifatta sul modello delle pagine "how it works" dei siti Awwwards (novembre 2026): Venezia a tutto
 * schermo con il titolo grande, passi in una striscia di foto che scorre in orizzontale con la pagina, chiusura su foto
 * a tutta larghezza. Foto da Pexels (HOW_PHOTOS). Classifica e sponsorizzati sono in /come-ordiniamo-i-risultati
 * (spostati il 15/11/2026: qui si parla solo a chi cerca).
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
