import type { Metadata } from "next";
import { LegalDraft } from "@/components/site/legal-draft";

export const metadata: Metadata = { title: "Informativa privacy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalDraft
      title="Informativa privacy"
      sections={[
        ["Quali dati raccogliamo", "Quando invii una richiesta di contatto raccogliamo nome, email, telefono, comune e i dettagli del lavoro che scrivi nel modulo."],
        ["A chi li inviamo", "Solo al partner che hai scelto, perché possa ricontattarti. Non li vendiamo e non li inviamo ad altri partner senza una tua nuova richiesta."],
        ["Richieste per una nuova provincia", "Se ci chiedi di arrivare nella tua provincia raccogliamo l'email, cosa cerchi e, se li scrivi, comune e lavoro da fare. Usiamo l'email solo per avvisarti quando arriviamo e contiamo le richieste per decidere dove aprire. Puoi chiederci di cancellarla in qualsiasi momento."],
        ["Conferma della richiesta", "Ti inviamo un codice via email per confermare la richiesta. Il codice è conservato solo in forma cifrata e scade dopo 10 minuti."],
        ["Marketing", "Il consenso a ricevere consigli e novità è facoltativo e separato. Puoi revocarlo in qualsiasi momento."],
        ["Cookie", "Cookie tecnici, sempre attivi: quello di accesso, se entri nella tua area; \"geco_visita\", un codice casuale che decide l'ordine delle aziende dello stesso piano nei risultati e si cancella quando chiudi il browser; \"geco_consenso\", che ricorda per 6 mesi la tua scelta sui cookie. Cookie di misurazione delle pubblicità, solo se premi \"Accetta\": Google Ads (_gcl_au e simili) e pixel di Meta (_fbp), che ci dicono quali nostre pubblicità hanno portato a una richiesta o a un'iscrizione e permettono di mostrarti le nostre pubblicità su altri siti. Google e Meta possono trasferire questi dati negli Stati Uniti, con le garanzie del Data Privacy Framework UE-USA. Se rifiuti non li usiamo. Quando questi cookie sono attivi, in fondo a ogni pagina trovi \"Preferenze cookie\" per cambiare scelta quando vuoi."],
        ["Dove sono conservati", "I dati delle richieste e degli account sono conservati su server nell'Unione Europea, presso fornitori con cui abbiamo accordi sul trattamento dei dati. Per i cookie di Google e Meta vedi la sezione Cookie."],
        ["I tuoi diritti", "Puoi chiedere accesso, rettifica, cancellazione o copia dei tuoi dati, e opporti al trattamento, scrivendo al titolare del trattamento. Se hai un account, dalla tua area puoi scaricare i tuoi dati, togliere il consenso alle comunicazioni promozionali ed eliminare l'account."],
      ]}
    />
  );
}
