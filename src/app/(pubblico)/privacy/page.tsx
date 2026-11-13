import type { Metadata } from "next";
import { LegalDraft } from "@/components/site/legal-draft";

export const metadata: Metadata = { title: "Informativa privacy" };

export default function PrivacyPage() {
  return (
    <LegalDraft
      title="Informativa privacy"
      sections={[
        ["Quali dati raccogliamo", "Quando invii una richiesta di contatto raccogliamo nome, email, telefono, comune e i dettagli del lavoro che scrivi nel modulo."],
        ["A chi li inviamo", "Solo al partner che hai scelto, perché possa ricontattarti. Non li vendiamo e non li inviamo ad altri partner senza una tua nuova richiesta."],
        ["Verifica del numero", "Ti inviamo un codice via SMS per confermare che il numero è tuo. Il codice è conservato solo in forma cifrata e scade dopo 10 minuti."],
        ["Mi piace, aziende seguite e commenti", "Se usi Ispirazione con il tuo account conserviamo i mi piace, le aziende che segui e i commenti che scrivi. I commenti sono pubblici, con il tuo nome e l'iniziale del cognome; mi piace e aziende seguite compaiono solo come numeri. Puoi eliminare un tuo commento, togliere un mi piace o smettere di seguire in qualsiasi momento. Se segnali un commento conserviamo la segnalazione per poterla valutare: chi è segnalato non vede chi l'ha fatta. Se togliamo un tuo commento conserviamo il testo e il motivo, per poter riguardare la decisione se la contesti."],
        ["Marketing", "Il consenso a ricevere consigli e novità è facoltativo e separato. Puoi revocarlo in qualsiasi momento."],
        ["Cookie", "Usiamo solo cookie tecnici: quello di accesso, se entri nella tua area, e \"geco_visita\", un codice casuale che decide l'ordine delle aziende dello stesso piano nei risultati e si cancella quando chiudi il browser. Non ti identifica e non serve a pubblicità o profilazione, quindi non chiediamo il consenso."],
        ["Dove sono conservati", "I dati sono conservati su server nell'Unione Europea, presso fornitori con cui abbiamo accordi sul trattamento dei dati."],
        ["I tuoi diritti", "Puoi chiedere accesso, rettifica, cancellazione o copia dei tuoi dati, e opporti al trattamento, scrivendo al titolare del trattamento."],
      ]}
    />
  );
}
