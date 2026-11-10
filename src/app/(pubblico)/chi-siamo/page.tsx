import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Chi siamo",
  description:
    "GecoItalia mette in contatto privati e famiglie con agenzie immobiliari, studi tecnici e artigiani del Veneto. Servizio gratuito per chi cerca, recensioni soltanto da clienti verificati.",
};

/** Pagina "Chi siamo": tono formale, su richiesta del cliente (10/11/2026). */
export default function AboutPage() {
  return (
    <div className="container-page flex max-w-4xl flex-col gap-12 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-h1">Chi siamo</h1>
        <p className="text-body-l text-ink-2">
          GecoItalia è una piattaforma nata in Veneto con l&apos;obiettivo di mettere in contatto privati e famiglie con le
          agenzie immobiliari, gli studi tecnici e le imprese artigiane che operano sul territorio.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-h2">La nostra missione</h2>
        <p className="text-body">
          L&apos;acquisto, la vendita o la ristrutturazione di un immobile richiedono scelte importanti. Confrontare gli
          operatori della propria zona, conoscere i costi indicativi di un intervento e individuare un professionista
          affidabile non è sempre agevole. Al tempo stesso, numerose imprese sostengono costi elevati per portali generalisti e
          contatti a consumo di scarsa qualità.
        </p>
        <p className="text-body">
          GecoItalia si propone di offrire uno strumento chiaro e affidabile: consentire a chi cerca di individuare in breve
          tempo il professionista più adatto e garantire alle imprese esclusivamente richieste autentiche.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-h2">I nostri principi</h2>
        <ul className="flex list-disc flex-col gap-3 pl-6 text-body">
          <li>
            <strong>Gratuità per l&apos;utente.</strong> La ricerca, il confronto e l&apos;invio di una richiesta di contatto
            sono gratuiti. Il servizio è sostenuto dagli abbonamenti delle imprese aderenti.
          </li>
          <li>
            <strong>Recensioni verificate.</strong> Possono pubblicare una recensione soltanto gli utenti che hanno inviato
            all&apos;impresa una richiesta verificata tramite SMS. L&apos;impresa ha facoltà di replicare, ma non di rimuoverla.
          </li>
          <li>
            <strong>Trasparenza.</strong> I criteri di ordinamento dei risultati sono pubblici e ogni contenuto a pagamento è
            contrassegnato dalla dicitura &quot;Sponsorizzato&quot;.
          </li>
          <li>
            <strong>Radicamento territoriale.</strong> Operiamo a partire dal Veneto, provincia per provincia, con imprese che
            conoscono a fondo il territorio in cui lavorano.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-h2">Per le imprese</h2>
        <p className="text-body">
          Agenzie immobiliari, studi tecnici e imprese artigiane possono attivare una scheda aziendale, pubblicare il proprio
          listino e i lavori realizzati e ricevere richieste di contatto da clienti della propria zona.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/trova-professionista">Avvia una ricerca</ButtonLink>
        <ButtonLink href="/per-i-professionisti" variant="secondary">
          Diventa partner
        </ButtonLink>
      </div>
    </div>
  );
}
