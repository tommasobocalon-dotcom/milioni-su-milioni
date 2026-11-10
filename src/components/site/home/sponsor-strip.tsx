import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getHomeSponsors } from "@/lib/data/home";
import { BOOST_HREF, SponsorMarquee } from "./sponsor-marquee";

/** Loghi minimi per metà nastro: con poche aziende la fila si ripete, così il nastro riempie lo schermo e scorre sempre. */
const MIN_PER_HALF = 8;

/**
 * Fascia divisoria con i loghi delle aziende in evidenza: partner con un pacchetto "Logo in evidenza in Home" in corso.
 * Niente etichetta "Sponsorizzato" (tolta dal cliente il 10/11/2026): il pagamento è dichiarato nel testo sotto il titolo,
 * nel link "Come funzionano i contenuti sponsorizzati" e nell'aria-label di ogni logo. Dati in cache per qualche minuto (getHomeSponsors), ordine mescolato nel browser (SponsorMarquee).
 */
export async function SponsorStrip() {
  const sponsors = await getHomeSponsors();
  const repeat =
    sponsors.length > 0 ? Math.ceil(MIN_PER_HALF / sponsors.length) : 0;

  return (
    <section
      aria-labelledby="in-evidenza"
      className="bg-page py-20 md:py-24"
    >
      <div
        data-reveal
        className="container-page flex flex-col items-center gap-3 text-center"
      >
        <h2
          id="in-evidenza"
          className="font-display text-[2.25rem] leading-tight tracking-[-0.02em] md:text-display-l"
        >
          Aziende in evidenza
        </h2>
        <p className="max-w-xl text-body text-neutro-700">
          {sponsors.length > 0
            ? "Aziende che pagano un pacchetto per comparire in questa fascia."
            : "Qui compaiono le aziende che acquistano un pacchetto di visibilità. Il posto è libero: può essere il tuo."}
        </p>
      </div>

      {sponsors.length > 0 && (
        <div data-reveal className="mt-10 overflow-hidden md:mt-12">
          {/* Due metà uguali (l'animazione sposta di -50%): la prima fila è quella leggibile, le altre sono copie nascoste
              ai lettori di schermo. Con "riduci movimento" resta solo la prima fila, ferma. */}
          <SponsorMarquee sponsors={sponsors} repeat={repeat} />
        </div>
      )}

      <div
        data-reveal
        className="container-page mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-body-s"
      >
        <Link
          href="/come-funziona#sponsorizzati"
          className="font-semibold text-ink-2 underline underline-offset-4 hover:text-ink"
        >
          Come funzionano i contenuti sponsorizzati
        </Link>
        <Link
          href={BOOST_HREF}
          className="group/link inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary-hover"
        >
          Metti in evidenza la tua azienda
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover/link:translate-x-1"
            aria-hidden
          />
        </Link>
      </div>
    </section>
  );
}
