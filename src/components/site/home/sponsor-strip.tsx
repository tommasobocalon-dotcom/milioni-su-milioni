import { getHomeSponsors } from "@/lib/data/home";
import { SponsorMarquee } from "./sponsor-marquee";

/** Loghi minimi per metà nastro: con poche aziende la fila si ripete, così il nastro riempie lo schermo e scorre sempre. */
const MIN_PER_HALF = 8;

/**
 * Fascia divisoria con i loghi delle aziende in evidenza: partner con un pacchetto "Logo in evidenza in Home" in corso.
 * Niente etichetta "Sponsorizzato" (tolta dal cliente il 10/11/2026), né acquisto nel testo sotto il titolo né riga di link
 * sotto i loghi (tolti dal cliente il 25/11/2026): il pagamento resta nell'aria-label di ogni logo e nel footer
 * ("Contenuti sponsorizzati"). Dati in cache per qualche minuto (getHomeSponsors), ordine mescolato nel browser (SponsorMarquee).
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
            ? "Alcune delle imprese del territorio che trovi su GecoItalia."
            : "Qui compaiono le aziende in evidenza. Il posto è libero: può essere il tuo."}
        </p>
      </div>

      {sponsors.length > 0 && (
        <div data-reveal className="mt-10 overflow-hidden md:mt-12">
          {/* Due metà uguali (l'animazione sposta di -50%): la prima fila è quella leggibile, le altre sono copie nascoste
              ai lettori di schermo. Con "riduci movimento" resta solo la prima fila, ferma. */}
          <SponsorMarquee sponsors={sponsors} repeat={repeat} />
        </div>
      )}
    </section>
  );
}
