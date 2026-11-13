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
        ["Ispirazione: mi piace, segui e commenti", "Chi ha un account può mettere mi piace ai lavori, seguire le aziende e, dopo aver confermato l'email, commentare i lavori per fare domande o dare consigli. Non sono recensioni né voti. Accanto a un commento compaiono il tuo nome e l'iniziale del cognome."],
        ["Regole dei commenti", "Nei commenti non sono ammessi: link e pubblicità, insulti e linguaggio volgare, contenuti illegali, dati personali di altre persone. Valgono un massimo di 500 caratteri e un limite di 5 commenti al minuto e 30 al giorno. Un commento con parole di un elenco (il nostro e quello scelto dall'azienda) non viene cancellato: si vede dopo l'approvazione dell'azienda. Sotto i propri lavori l'azienda può nascondere un commento, limitare o bloccare chi scrive; chi ha scritto vede sempre lo stato del proprio commento."],
        ["Segnalazioni e decisioni", "Chiunque può segnalare un commento: dal menu accanto al commento se ha un account, altrimenti dalla pagina Assistenza. Chi è segnalato non viene a sapere da chi. Una persona del nostro team guarda le segnalazioni. Se toglie un commento, chi l'ha scritto riceve un'email con il testo tolto, il motivo e le conseguenze: la prima volta è un avviso, la seconda i commenti si fermano per 7 giorni, la terza per 30 giorni, dalla quarta sono bloccati. Il resto dell'account continua a funzionare. La decisione si può contestare dalla pagina Assistenza: la riguarda una persona e, se era sbagliata, il commento torna visibile e la violazione non conta più."],
        ["Ordinamento e sponsorizzazioni", "I criteri di ordinamento sono spiegati nella pagina Come funziona. I contenuti sponsorizzati sono sempre etichettati."],
      ]}
    />
  );
}
