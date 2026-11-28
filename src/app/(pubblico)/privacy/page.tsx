import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraft } from "@/components/site/legal-draft";
import { LEGAL_EMAIL } from "@/lib/domain/legal";

export const metadata: Metadata = { title: "Informativa privacy", alternates: { canonical: "/privacy" } };

const mail = <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>;

export default function PrivacyPage() {
  return (
    <LegalDraft
      title="Informativa privacy"
      intro={
        <>
          <p className="font-semibold">In breve</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>Usiamo i tuoi dati per metterti in contatto con le aziende che scegli tu, per gestire il tuo account e, se sei un&apos;azienda, la tua scheda e il tuo abbonamento.</li>
            <li>Una richiesta di contatto arriva solo all&apos;azienda a cui la invii. Non vendiamo i tuoi dati.</li>
            <li>Il database è nell&apos;Unione Europea (Francoforte). Alcuni fornitori sono società statunitensi: li elenchiamo qui sotto, con le garanzie previste.</li>
            <li>Newsletter e cookie pubblicitari solo se li accetti, e puoi cambiare idea quando vuoi.</li>
            <li>
              Dalla tua area puoi scaricare i tuoi dati ed eliminare l&apos;account. Per tutto il resto scrivi a{" "}
              <a href={`mailto:${LEGAL_EMAIL}`} className="font-semibold text-primary underline">
                {LEGAL_EMAIL}
              </a>
              .
            </li>
          </ul>
        </>
      }
      sections={[
        [
          "Chi è il titolare del trattamento",
          <>
            <p>
              Il titolare del trattamento è il gestore di GecoItalia (gecoitalia.it). La società è in costituzione: ragione sociale, sede e partita IVA saranno
              indicate qui prima dell&apos;apertura al pubblico.
            </p>
            <p>Per qualsiasi domanda sui tuoi dati, o per esercitare i tuoi diritti, scrivi a {mail}. Non abbiamo nominato un responsabile della protezione dei dati (DPO).</p>
          </>,
        ],
        [
          "Quali dati raccogliamo",
          <>
            <p>Raccogliamo solo i dati che servono al servizio. Dipende da cosa fai sul sito:</p>
            <ul>
              <li>
                <strong>Se invii una richiesta di contatto</strong>: nome, email, telefono, comune del lavoro, tipo di lavoro, risposte alle domande del modulo,
                descrizione, tempi, fascia oraria in cui preferisci essere richiamato, le tue scelte sui consensi. Per confermare la richiesta ti mandiamo un codice via
                email: lo salviamo solo in forma cifrata e scade dopo 10 minuti. Se rispondi all&apos;email &laquo;Com&apos;è andata?&raquo; salviamo anche se
                l&apos;azienda ti ha richiamato.
              </li>
              <li>
                <strong>Se crei un account</strong>: nome, email e password. La password la salviamo solo in forma cifrata (hash): nessuno, nemmeno noi, può
                leggerla. Se entri con Google riceviamo da loro nome, email e un identificativo dell&apos;account, mai la tua password.
              </li>
              <li>
                <strong>Se registri un&apos;azienda</strong>: nome, email e telefono di chi la gestisce; ragione sociale, partita IVA, codice fiscale, codice SDI o
                PEC, indirizzo della sede; i contenuti della scheda (descrizione, foto, lavori, prezzi indicativi, orari, zone servite); abbonamento, pacchetti
                acquistati e storico dei pagamenti. I pagamenti passano da Stripe: noi non vediamo e non salviamo numeri di carta o codici IBAN completi.
              </li>
              <li>
                <strong>Se scrivi all&apos;assistenza</strong>: nome, email, il testo dei messaggi e le note del nostro team sulla pratica.
              </li>
              <li>
                <strong>Se ci chiedi di avvisarti quando arriviamo nella tua zona</strong>: email, comune o provincia e il servizio che cerchi.
              </li>
              <li>
                <strong>Dati tecnici e di sicurezza</strong>: indirizzo IP e azioni compiute (accessi, registrazioni, invii dei moduli), per limitare i tentativi
                ripetuti e bloccare abusi; i tentativi di accesso falliti, con l&apos;email usata; la verifica antispam di Cloudflare Turnstile; i dati tecnici degli
                errori del sito, da cui togliamo email, indirizzo IP, cookie e contenuto dei moduli prima di inviarli al servizio che li raccoglie.
              </li>
              <li>
                <strong>Statistiche delle schede</strong>: contiamo le visite e le aperture del modulo di contatto di ogni scheda una volta al giorno per visitatore.
                Per farlo usiamo un&apos;impronta cifrata dell&apos;indirizzo IP che cambia ogni giorno: non ci permette di sapere chi sei.
              </li>
            </ul>
            <p>
              I dati segnati come obbligatori nei moduli servono per darti il servizio: senza, non possiamo inoltrare la richiesta o creare l&apos;account. Il
              servizio è riservato ai maggiorenni.
            </p>
          </>,
        ],
        [
          "Perché li usiamo e con quale base giuridica",
          <ul key="basi">
            <li>
              <strong>Inoltrare la tua richiesta all&apos;azienda che hai scelto e confermarla</strong>: lo chiedi tu ed è necessario per darti il servizio (art.
              6.1.b del GDPR).
            </li>
            <li>
              <strong>Gestire il tuo account, la tua area, la scheda dell&apos;azienda e l&apos;assistenza</strong>: esecuzione del contratto con te (art. 6.1.b).
            </li>
            <li>
              <strong>Abbonamenti, pagamenti e fatture delle aziende</strong>: esecuzione del contratto (art. 6.1.b) e obblighi fiscali e contabili (art. 6.1.c).
            </li>
            <li>
              <strong>Verificare i dati delle aziende prima di pubblicarne la scheda</strong>, per evitare che qualcuno si registri con la partita IVA di
              un&apos;altra azienda: legittimo interesse nostro e di chi cerca (art. 6.1.f).
            </li>
            <li>
              <strong>Un&apos;email dopo qualche giorno per chiederti com&apos;è andata</strong> e, se nessuno ti ha richiamato, proporti altre aziende vicine: nostro
              legittimo interesse a controllare che il servizio funzioni (art. 6.1.f). È una sola email per richiesta e puoi opporti scrivendoci.
            </li>
            <li>
              <strong>Sicurezza, antispam, limite ai tentativi, registro delle attività e copie di sicurezza</strong>: nostro legittimo interesse a proteggere il
              sito e i dati di tutti (art. 6.1.f).
            </li>
            <li>
              <strong>Consigli e novità per la casa via email</strong>: solo con il tuo consenso, facoltativo e separato (art. 6.1.a). Puoi toglierlo quando vuoi.
            </li>
            <li>
              <strong>Cookie di misurazione delle pubblicità</strong>: solo con il tuo consenso (art. 6.1.a del GDPR e art. 122 del Codice privacy).
            </li>
            <li>
              <strong>Difendere i nostri diritti</strong> in caso di contestazioni o richieste delle autorità: legittimo interesse (art. 6.1.f) e obblighi di legge
              (art. 6.1.c).
            </li>
          </ul>,
        ],
        [
          "A chi arrivano i tuoi dati",
          <>
            <ul>
              <li>
                <strong>All&apos;azienda a cui invii la richiesta</strong>, e a nessun&apos;altra senza una tua nuova richiesta: riceve nome, email, telefono, comune e
                i dettagli del lavoro per ricontattarti. Da quel momento l&apos;azienda è titolare autonoma di questi dati e risponde lei di come li usa, secondo la
                sua informativa.
              </li>
              <li>
                <strong>A chiunque visiti il sito</strong>, solo per le aziende: i dati che l&apos;azienda pubblica sulla scheda (nome, sede, contatti, foto, lavori,
                prezzi indicativi).
              </li>
              <li>
                <strong>Ai fornitori che ci aiutano a far funzionare il sito</strong>, che trattano i dati per nostro conto e secondo le nostre istruzioni (art. 28
                del GDPR): Supabase (database e foto, server a Francoforte), Vercel (hosting del sito, server a Francoforte), Brevo (invio delle email, Francia),
                Cloudflare (antispam Turnstile), Sentry (errori tecnici, server nell&apos;Unione Europea), GitHub (copie di sicurezza cifrate del database e delle
                foto), iubenda (gestione delle preferenze sui cookie, Italia).
              </li>
              <li>
                <strong>A Stripe</strong>, per i pagamenti delle aziende. Per alcune attività, come i controlli antifrode e antiriciclaggio, Stripe agisce come
                titolare autonomo, secondo la sua informativa.
              </li>
              <li>
                <strong>A Google</strong>, solo se scegli di entrare con il tuo account Google.
              </li>
              <li>
                <strong>A Google e Meta</strong>, solo se accetti i cookie di misurazione delle pubblicità (vedi Cookie).
              </li>
              <li>
                <strong>Al nostro commercialista</strong>, per emettere le fatture elettroniche alle aziende.
              </li>
              <li>
                <strong>Alle autorità</strong>, solo quando la legge lo impone.
              </li>
            </ul>
            <p>Non vendiamo i tuoi dati e non li cediamo ad altri per le loro pubblicità.</p>
          </>,
        ],
        [
          "Trasferimenti fuori dall'Unione Europea",
          "Vercel, Cloudflare, GitHub, Stripe, Sentry, Google e Meta sono società statunitensi o fanno parte di gruppi statunitensi, quindi alcuni dati possono essere trattati negli Stati Uniti. In questi casi il trasferimento avviene con le garanzie previste dal GDPR: l'adesione della società al Data Privacy Framework UE-USA oppure le clausole contrattuali standard approvate dalla Commissione europea. Le copie di sicurezza salvate su GitHub sono cifrate prima di uscire dai nostri sistemi.",
        ],
        [
          "Per quanto tempo li conserviamo",
          <>
            <ul>
              <li>Codice di conferma della richiesta: 10 minuti.</li>
              <li>Link via email per confermare l&apos;indirizzo o cambiare password: valgono una volta sola e scadono dopo poco tempo.</li>
              <li>Sessione di accesso: 30 giorni, poi devi rientrare.</li>
              <li>Account: finché non lo elimini. Se lo elimini, cancelliamo nome ed email e togliamo dalle tue richieste nome, contatti, descrizione e risposte.</li>
              <li>Dati delle aziende: per tutta la durata del rapporto. Dati di fatturazione e pagamenti: 10 anni, come chiede la legge (art. 2220 del Codice civile).</li>
              <li>Consenso alle comunicazioni promozionali: finché non lo togli.</li>
              <li>Richiesta di avviso per la tua zona: finché non ti avvisiamo o non ci chiedi di cancellarla.</li>
              <li>Copie di sicurezza del database: al massimo 90 giorni.</li>
              <li>Cookie: per la durata indicata nella sezione Cookie.</li>
            </ul>
            <p>
              Per le richieste di contatto, i messaggi all&apos;assistenza e il registro di sicurezza stiamo definendo un tempo massimo di conservazione, che
              indicheremo qui prima dell&apos;apertura al pubblico. Fino ad allora li conserviamo per il tempo necessario a dare il servizio e a gestire eventuali
              contestazioni, e li cancelliamo prima se ce lo chiedi, salvo obblighi di legge.
            </p>
          </>,
        ],
        [
          "Cookie",
          <>
            <p>
              <strong>Cookie tecnici</strong>, sempre attivi perché servono al sito: quello di accesso, se entri nella tua area (dura 30 giorni); &laquo;geco_visita&raquo;,
              un codice casuale che decide l&apos;ordine delle aziende dello stesso piano nei risultati e si cancella quando chiudi il browser; &laquo;geco_consenso&raquo;,
              che ricorda per 6 mesi la tua scelta sui cookie; &laquo;geco_azienda&raquo;, che ricorda quale azienda stai gestendo se ne hai più di una.
            </p>
            <p>
              <strong>Cookie di misurazione delle pubblicità</strong>, solo se li accetti: Google Ads (_gcl_au e simili) e pixel di Meta (_fbp). Ci dicono quali nostre
              pubblicità hanno portato a una richiesta o a un&apos;iscrizione e permettono di mostrarti le nostre pubblicità su altri siti. Se rifiuti non li usiamo,
              e il sito funziona lo stesso.
            </p>
            <p>Quando questi cookie sono attivi, in fondo a ogni pagina trovi &laquo;Preferenze cookie&raquo; per cambiare scelta quando vuoi.</p>
          </>,
        ],
        [
          "I tuoi diritti",
          <>
            <p>In ogni momento puoi chiedere di:</p>
            <ul>
              <li>sapere quali dati abbiamo su di te e averne una copia (accesso e portabilità);</li>
              <li>correggerli o completarli (rettifica);</li>
              <li>cancellarli (cancellazione), salvo quelli che la legge ci obbliga a tenere;</li>
              <li>limitarne l&apos;uso mentre verifichiamo una tua contestazione (limitazione);</li>
              <li>opporti all&apos;uso basato sul nostro legittimo interesse, come l&apos;email &laquo;Com&apos;è andata?&raquo; (opposizione);</li>
              <li>togliere un consenso già dato, senza conseguenze su quello che è stato fatto prima.</li>
            </ul>
            <p>
              Se hai un account, dalla <Link href="/area-cliente">tua area</Link> puoi già scaricare i tuoi dati, togliere il consenso alle comunicazioni promozionali
              ed eliminare l&apos;account. Per il resto scrivi a {mail}: ti rispondiamo entro un mese. Le richieste già consegnate restano anche all&apos;azienda che le
              ha ricevute: per i dati in suo possesso puoi rivolgerti anche direttamente a lei.
            </p>
            <p>
              Se pensi che trattiamo i tuoi dati in modo non corretto puoi presentare reclamo al Garante per la protezione dei dati personali (
              <a href="https://www.garanteprivacy.it" rel="noopener noreferrer" target="_blank">
                garanteprivacy.it
              </a>
              ).
            </p>
          </>,
        ],
        [
          "Decisioni automatiche",
          <p key="auto">
            Non prendiamo decisioni automatiche che abbiano effetti giuridici su di te. L&apos;ordine delle aziende nei risultati non dipende dai tuoi dati: i criteri
            sono spiegati in <Link href="/come-ordiniamo-i-risultati">Come ordiniamo i risultati</Link>.
          </p>,
        ],
        [
          "Modifiche a questa informativa",
          "Se cambiamo il modo in cui usiamo i dati aggiorniamo questa pagina e la data in alto. Per i cambiamenti importanti avvisiamo per email chi ha un account.",
        ],
      ]}
    />
  );
}
