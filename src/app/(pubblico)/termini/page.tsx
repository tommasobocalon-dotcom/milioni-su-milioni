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
        ["Per i partner: lead e token", "Conta solo un lead verificato con SMS e consegnato. I duplicati si annullano in automatico. Un lead si può segnalare entro 72 ore solo per motivi oggettivi. I token sono prepagati, validi 12 mesi, non convertibili in denaro."],
        ["Ordinamento e sponsorizzazioni", "I criteri di ordinamento sono spiegati nella pagina Come funziona. I contenuti sponsorizzati sono sempre etichettati."],
      ]}
    />
  );
}
