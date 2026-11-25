import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Lock, MapPin, Scale, ShieldCheck, type LucideIcon } from "lucide-react";
import { TimelineSteps } from "@/components/site/timeline-steps";
import { ButtonLink } from "@/components/ui/button";
import { ABOUT_PHOTOS } from "@/lib/data/category-photos";

export const metadata: Metadata = {
  alternates: { canonical: "/chi-siamo" },
  title: "Chi siamo",
  description:
    "GecoItalia è il servizio online, nato in Veneto, che aiuta privati e famiglie a trovare agenzie immobiliari, studi tecnici e imprese artigiane della propria zona e a mettersi in contatto con loro.",
};

const WHAT_WE_DO = [
  {
    title: "Raccogliamo le imprese del territorio",
    text: "Agenzie immobiliari, geometri, architetti, idraulici, elettricisti, imbianchini e imprese di ristrutturazione del Veneto, riuniti in un unico luogo e suddivisi per attività e per zona.",
    image: ABOUT_PHOTOS.businesses,
  },
  {
    title: "Presentiamo ogni impresa in modo completo",
    text: "Ciascuna impresa dispone di una scheda con la descrizione dell'attività, i servizi offerti, i comuni in cui opera, gli orari e i lavori già realizzati, così da poterla conoscere prima di contattarla.",
    image: ABOUT_PHOTOS.profile,
  },
  {
    title: "Facilitiamo il primo contatto",
    text: "Una richiesta guidata, compilata in pochi passaggi, consente di spiegare all'impresa di che cosa si ha bisogno e di essere richiamati nella fascia oraria preferita.",
    image: ABOUT_PHOTOS.contact,
  },
];

const STEPS = [
  { title: "Descrivi cosa ti serve", text: "Scrivi il lavoro o il servizio che cerchi e il comune o la provincia in cui si trova la casa." },
  { title: "Scegli l'impresa", text: "Guarda le schede delle imprese che lavorano in quella zona e scegli quella che fa per te." },
  { title: "Invia la richiesta", text: "Compila la richiesta di contatto e confermala con il codice che ti arriva via email." },
  { title: "Vieni ricontattato", text: "L'impresa ti richiama nella fascia oraria che hai indicato nella richiesta." },
];

const COMMITMENTS: { icon: LucideIcon; title: string; body: ReactNode }[] = [
  {
    icon: ShieldCheck,
    title: "Richieste autentiche",
    body: "Ogni richiesta di contatto è confermata con un codice via email: così le imprese ricevono solo richieste vere e possono risponderti con attenzione.",
  },
  {
    icon: Scale,
    title: "Trasparenza",
    body: (
      <>
        I criteri con cui ordiniamo i risultati sono pubblici e i contenuti promozionali sono sempre contrassegnati dalla dicitura
        &quot;Sponsorizzato&quot;.{" "}
        <Link href="/come-ordiniamo-i-risultati" className="font-semibold text-primary underline">
          Come ordiniamo i risultati
        </Link>
      </>
    ),
  },
  {
    icon: Lock,
    title: "Riservatezza",
    body: (
      <>
        I dati che scrivi nella richiesta servono solo a metterti in contatto con l&apos;impresa che hai scelto e li trattiamo nel
        rispetto della normativa sulla protezione dei dati personali.{" "}
        <Link href="/privacy" className="font-semibold text-primary underline">
          Informativa privacy
        </Link>
      </>
    ),
  },
  {
    icon: MapPin,
    title: "Legame con il territorio",
    body: "Operiamo a partire dal Veneto, provincia per provincia, insieme a imprese che conoscono a fondo i luoghi in cui lavorano.",
  },
];

/** Pagina "Chi siamo": tono formale, senza abbonamenti né costi, con foto (soci, 11/11/2026). */
export default function AboutPage() {
  return (
    <>
      {/* Apertura: testo a sinistra, il Veneto a destra (sul telefono la foto va sotto). */}
      <section className="bg-brand text-on-brand">
        <div className="container-page grid items-center gap-10 py-12 md:py-16 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-h1 md:text-display-xl">Chi siamo</h1>
            <p className="text-body-l text-on-brand-muted">
              GecoItalia è un servizio online nato in Veneto che aiuta privati e famiglie a individuare, nella propria zona, le
              agenzie immobiliari, gli studi tecnici e le imprese artigiane a cui affidarsi per la casa, e a mettersi in contatto
              con loro in modo semplice e sicuro.
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <Image src={ABOUT_PHOTOS.hero.src} alt={ABOUT_PHOTOS.hero.alt} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      <section aria-labelledby="perche" className="container-page grid items-center gap-10 py-16 md:py-20 lg:grid-cols-[5fr_7fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
          <Image
            src={ABOUT_PHOTOS.why.src}
            alt={ABOUT_PHOTOS.why.alt}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-4">
          <h2 id="perche" className="font-display text-h2 md:text-h1">
            Perché esistiamo
          </h2>
          <p className="text-body-l">
            Comprare, vendere o affittare un immobile, ristrutturare un bagno, sostituire un impianto o ottenere una pratica
            tecnica sono decisioni importanti. Spesso, però, non è facile sapere a chi rivolgersi: le informazioni sono sparse, le
            imprese della zona non sempre sono visibili e il passaparola non basta.
          </p>
          <p className="text-body-l text-ink-2">
            GecoItalia nasce per rispondere a questa esigenza: offrire un punto di riferimento unico in cui trovare le imprese che
            lavorano vicino a casa, conoscerle prima di contattarle e parlare direttamente con chi può svolgere il lavoro.
          </p>
        </div>
      </section>

      <section aria-labelledby="cosa-facciamo" className="bg-surface">
        <div className="container-page flex flex-col gap-8 py-16 md:py-20">
          <h2 id="cosa-facciamo" className="font-display text-h2 md:text-h1">
            Che cosa facciamo
          </h2>
          <ul className="grid gap-6 md:grid-cols-3">
            {WHAT_WE_DO.map((item) => (
              <li key={item.title} className="flex flex-col overflow-hidden rounded-lg border border-line bg-page">
                <div className="relative aspect-[3/2]">
                  <Image src={item.image.src} alt={item.image.alt} fill sizes="(min-width: 768px) 30vw, 100vw" className="object-cover" />
                </div>
                <div className="flex flex-col gap-2 p-6">
                  <h3 className="text-h4 font-semibold">{item.title}</h3>
                  <p className="text-body-s text-ink-2">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="come-si-utilizza" className="container-page flex flex-col gap-8 py-16 md:py-20">
        <h2 id="come-si-utilizza" className="font-display text-h2 md:text-h1">
          Come si utilizza
        </h2>
        <TimelineSteps steps={STEPS} />
      </section>

      <section aria-labelledby="impegni" className="bg-subtle">
        <div className="container-page flex flex-col gap-8 py-16 md:py-20">
          <h2 id="impegni" className="font-display text-h2 md:text-h1">
            I nostri impegni
          </h2>
          <ul className="grid gap-6 md:grid-cols-2">
            {COMMITMENTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4 rounded-lg bg-surface p-6">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-h4 font-semibold">{title}</h3>
                  <p className="text-body-s text-ink-2">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Chiusura: due strade affiancate, per chi cerca e per chi lavora (sul telefono una sotto l'altra). */}
      <section aria-labelledby="inizia" className="bg-brand-soft">
        <div className="container-page flex flex-col gap-10 py-16 md:py-20">
          <h2 id="inizia" className="font-display text-h2 md:text-h1">
            Da dove vuoi iniziare?
          </h2>
          <div className="grid gap-10 md:grid-cols-2 md:gap-0 md:divide-x md:divide-brand/20">
            <div className="flex flex-col items-start gap-4 md:pr-12">
              <h3 className="text-h3 font-semibold">Cerchi qualcuno per la casa</h3>
              <p className="text-body-l text-ink">
                Trova l&apos;agenzia, il tecnico o l&apos;impresa artigiana che lavora nel tuo comune e scrivile in pochi passaggi.
                Per te il servizio è gratuito.
              </p>
              <ButtonLink href="/trova-professionista" className="mt-2">
                Avvia una ricerca
              </ButtonLink>
            </div>
            <div className="flex flex-col items-start gap-4 border-t border-brand/20 pt-10 md:border-t-0 md:pt-0 md:pl-12">
              <h3 className="text-h3 font-semibold">Hai un&apos;impresa in Veneto</h3>
              <p className="text-body-l text-ink">
                Presenta la tua attività con una scheda dedicata, mostra i lavori che hai realizzato e ricevi richieste di
                contatto da clienti della tua zona.
              </p>
              <ButtonLink href="/per-i-professionisti" variant="secondary" className="mt-2">
                Scopri i piani per la tua impresa
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
