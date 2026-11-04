import type { Metadata } from "next";
import { Geco } from "@/components/site/geco";
import { ButtonLink } from "@/components/ui/button";
import { RANKING_WEIGHTS } from "@/lib/domain/ranking";

export const metadata: Metadata = {
  title: "Come funziona",
  description: "Come cerchiamo, ordiniamo e verifichiamo: recensioni solo da richieste verificate, contenuti sponsorizzati sempre etichettati.",
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function HowItWorksPage() {
  return (
    <div className="container-page flex max-w-4xl flex-col gap-12 py-12">
      <header className="flex flex-col items-start gap-6 md:flex-row md:items-center">
        <Geco outfit="saluto" size={140} />
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-h1">Come funziona</h1>
          <p className="text-body-l text-ink-2">
            Trovi agenzie, tecnici e artigiani della tua zona, confronti prezzi indicativi e recensioni verificate, e chiedi di
            essere ricontattato. È gratis per chi cerca: i partner pagano un abbonamento.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-h2">Per chi cerca</h2>
        <ol className="flex list-decimal flex-col gap-3 pl-6 text-body">
          <li>Scegli la sezione: Trova Casa per le agenzie, Trova Professionista per tecnici e artigiani.</li>
          <li>Filtra per comune, tipo di lavoro e valutazione. Ogni scheda mostra prezzi indicativi, zone servite e portfolio.</li>
          <li>Invia una richiesta guidata. Verifichiamo il tuo numero con un SMS: così i professionisti ricevono solo richieste vere.</li>
          <li>Vieni ricontattato nella fascia oraria che preferisci. Se il partner non può rispondere, ti proponiamo alternative.</li>
        </ol>
      </section>

      <section id="recensioni" className="flex flex-col gap-3 scroll-mt-24">
        <h2 className="font-display text-h2">Come verifichiamo le recensioni</h2>
        <p className="text-body">
          Può recensire un partner solo chi gli ha inviato una richiesta verificata con SMS tramite la piattaforma. Il partner può
          rispondere pubblicamente e segnalare una recensione, ma non può cancellarla. Un filtro automatico blocca linguaggio
          offensivo e dati personali; le segnalazioni le valuta il nostro team.
        </p>
      </section>

      <section id="ordinamento" className="flex flex-col gap-3 scroll-mt-24">
        <h2 className="font-display text-h2">Come ordiniamo i risultati</h2>
        <p className="text-body">I risultati organici sono ordinati con un punteggio che combina:</p>
        <ul className="flex flex-col gap-1.5 text-body">
          <li>valutazione media ponderata, che premia molte recensioni solide più di pochi voti alti ({pct(RANKING_WEIGHTS.rating)});</li>
          <li>vicinanza al comune cercato ({pct(RANKING_WEIGHTS.proximity)});</li>
          <li>completezza della scheda ({pct(RANKING_WEIGHTS.completeness)});</li>
          <li>tempo di risposta ({pct(RANKING_WEIGHTS.response)});</li>
          <li>piano di abbonamento ({pct(RANKING_WEIGHTS.plan)}).</li>
        </ul>
        <p className="text-body">
          Vediamo solo i partner che servono la zona cercata. Puoi sempre ordinare per valutazione, numero di recensioni, distanza o
          prezzo indicativo.
        </p>
      </section>

      <section id="sponsorizzati" className="flex flex-col gap-3 scroll-mt-24">
        <h2 className="font-display text-h2">Contenuti sponsorizzati</h2>
        <p className="text-body">
          I partner possono acquistare posizioni in evidenza per la loro categoria e provincia. Questi posti sono separati dai
          risultati organici, al massimo due per pagina, e sono sempre etichettati come &quot;Sponsorizzato&quot;.
        </p>
      </section>

      <ButtonLink href="/trova-professionista" className="self-start">
        Inizia a cercare
      </ButtonLink>
    </div>
  );
}
