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
        ["Marketing", "Il consenso a ricevere consigli e novità è facoltativo e separato. Puoi revocarlo in qualsiasi momento."],
        ["Dove sono conservati", "I dati sono conservati su server nell'Unione Europea, presso fornitori con cui abbiamo accordi sul trattamento dei dati."],
        ["I tuoi diritti", "Puoi chiedere accesso, rettifica, cancellazione o copia dei tuoi dati, e opporti al trattamento, scrivendo al titolare del trattamento."],
      ]}
    />
  );
}
