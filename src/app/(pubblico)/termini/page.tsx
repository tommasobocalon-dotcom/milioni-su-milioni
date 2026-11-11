import type { Metadata } from "next";
import { LegalDraft } from "@/components/site/legal-draft";

export const metadata: Metadata = { title: "Termini e condizioni" };

export default function TermsPage() {
  return (
    <LegalDraft
      title="Termini e condizioni"
      sections={[
        ["Per chi cerca", "Il servizio è gratuito. La piattaforma mette in contatto con i partner ma non è parte del contratto tra te e il professionista, e non gestisce pagamenti per i lavori."],
        ["Prezzi indicativi", "I prezzi pubblicati dai partner sono indicativi e non vincolanti. Il preventivo definitivo lo concordi con il partner."],
        ["Per i partner: abbonamento", "Abbonamento mensile o annuale con pagamento anticipato e rinnovo automatico. In caso di pagamento non riuscito l'account viene sospeso fino al pagamento. La disdetta vale a fine periodo pagato."],
        ["Per i partner: richieste dei clienti", "Le richieste dei clienti sono gratuite e illimitate con tutti i piani. Conta solo una richiesta verificata con SMS e consegnata; i duplicati si annullano in automatico. Una richiesta si può segnalare entro 72 ore solo per motivi oggettivi."],
        ["Per i partner: pacchetti di visibilità", "Logo in Home, boost nella ricerca ed estensione ad altri comuni si acquistano a pacchetti in euro, IVA esclusa, con pagamento anticipato. Valgono per la durata indicata al momento dell'acquisto e non si rinnovano da soli."],
        ["Ordinamento e sponsorizzazioni", "I criteri di ordinamento sono spiegati nella pagina Come funziona. I contenuti sponsorizzati sono sempre etichettati."],
      ]}
    />
  );
}
