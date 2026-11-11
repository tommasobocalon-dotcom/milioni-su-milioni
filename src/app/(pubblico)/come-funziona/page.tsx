import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Come funziona",
  description: "Come ordiniamo i risultati (piano di abbonamento e boost). Contenuti sponsorizzati sempre etichettati.",
};


export default function HowItWorksPage() {
  return (
    <div className="container-page flex max-w-4xl flex-col gap-12 py-12">
      <header className="flex flex-col items-start gap-6 md:flex-row md:items-center">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-h1">Come funziona</h1>
          <p className="text-body-l text-ink-2">
            Trovi agenzie, tecnici e artigiani della tua zona, confronti prezzi indicativi e lavori svolti, e chiedi di
            essere ricontattato. È gratis per chi cerca: i partner pagano un abbonamento.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-h2">Per chi cerca</h2>
        <ol className="flex list-decimal flex-col gap-3 pl-6 text-body">
          <li>Scegli la sezione: Trova Casa per le agenzie, Trova Professionista per tecnici e artigiani.</li>
          <li>Filtra per comune o provincia e tipo di lavoro. Ogni scheda mostra prezzi indicativi, zone servite e portfolio.</li>
          <li>Invia una richiesta guidata. Verifichiamo il tuo numero con un SMS: così i professionisti ricevono solo richieste vere.</li>
          <li>Vieni ricontattato nella fascia oraria che preferisci. Se il partner non può rispondere, ti proponiamo alternative.</li>
        </ol>
      </section>

      <section id="ordinamento" className="flex flex-col gap-3 scroll-mt-24">
        <h2 className="font-display text-h2">Come ordiniamo i risultati</h2>
        <p className="text-body">
          Mostriamo solo le aziende che lavorano nella categoria e nella zona che cerchi. Poi l&apos;ordine dipende dal piano di
          abbonamento che l&apos;azienda paga e dal boost a pagamento:
        </p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-6 text-body">
          <li>piano Premium (&quot;Partner Elite&quot;, scheda con il bordo lilla) con boost attivo;</li>
          <li>piano Premium;</li>
          <li>piano Normal (&quot;Partner Pro&quot;, scheda con il bordo verde) con boost attivo;</li>
          <li>piano Normal;</li>
          <li>piano Base.</li>
        </ol>
        <p className="text-body">
          Tra aziende dello stesso gruppo l&apos;ordine cambia da un visitatore all&apos;altro, così nessuna resta sempre prima. Il
          riquadro grande in cima va a un&apos;azienda Premium, a rotazione. I prezzi non cambiano l&apos;ordine
          consigliato, ma puoi ordinare tu per distanza o prezzo indicativo.
        </p>
      </section>

      <section id="sponsorizzati" className="flex flex-col gap-3 scroll-mt-24">
        <h2 className="font-display text-h2">Contenuti sponsorizzati</h2>
        <p className="text-body">
          Il riquadro grande in cima e le aziende con un boost attivo sono posti a pagamento: li riconosci dalla scritta
          &quot;Sponsorizzato&quot;. Il boost nella ricerca vale per la categoria e la provincia dell&apos;azienda e dura 24 o 48 ore.
          Con un pacchetto a pagamento di 7 o 30 giorni l&apos;azienda mette il suo logo nella fascia &quot;Aziende in evidenza&quot; della
          Home, dove i loghi scorrono in un ordine che cambia a ogni visita. Un&apos;azienda può anche pagare per comparire nelle
          ricerche di altri comuni del Veneto oltre alla sua zona, 30 giorni per ogni comune scelto: lì segue lo stesso ordine
          delle altre aziende, in base al piano. I lavori in evidenza nella pagina Ispirazione portano anch&apos;essi la scritta
          &quot;Sponsorizzato&quot;.
        </p>
      </section>

      <ButtonLink href="/trova-professionista" className="self-start">
        Inizia a cercare
      </ButtonLink>
    </div>
  );
}
