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
        ["Conferma della richiesta", "Ti inviamo un codice via email per confermare la richiesta. Il codice è conservato solo in forma cifrata e scade dopo 10 minuti."],
        ["Marketing", "Il consenso a ricevere consigli e novità è facoltativo e separato. Puoi revocarlo in qualsiasi momento."],
        ["Cookie", "Cookie tecnici, sempre attivi: quello di accesso, se entri nella tua area; \"geco_visita\", un codice casuale che decide l'ordine delle aziende dello stesso piano nei risultati e si cancella quando chiudi il browser; \"geco_consenso\", che ricorda per 6 mesi la tua scelta sui cookie. Cookie di misurazione delle pubblicità, solo se premi \"Accetta\": Google Ads (_gcl_au e simili) e pixel di Meta (_fbp), che ci dicono quali nostre pubblicità hanno portato a una richiesta o a un'iscrizione e permettono di mostrarti le nostre pubblicità su altri siti. Google e Meta possono trasferire questi dati negli Stati Uniti, con le garanzie del Data Privacy Framework UE-USA. Se rifiuti non li usiamo. Puoi cambiare scelta quando vuoi da \"Preferenze cookie\" in fondo a ogni pagina."],
        ["Dove sono conservati", "I dati delle richieste e degli account sono conservati su server nell'Unione Europea, presso fornitori con cui abbiamo accordi sul trattamento dei dati. Per i cookie di Google e Meta vedi la sezione Cookie."],
        ["I tuoi diritti", "Puoi chiedere accesso, rettifica, cancellazione o copia dei tuoi dati, e opporti al trattamento, scrivendo al titolare del trattamento."],
      ]}
    />
  );
}
