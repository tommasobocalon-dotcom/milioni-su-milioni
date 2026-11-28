import type { Metadata } from "next";
import Link from "next/link";
import { MediaCredits } from "@/components/site/credits";
import { LegalDraft } from "@/components/site/legal-draft";
import { TRIAL_DAYS } from "@/lib/domain/billing";
import { FREE_LEADS } from "@/lib/domain/free-plan";
import { REPORT_REASONS, REPORT_WINDOW_HOURS } from "@/lib/domain/lead-rules";
import { LEGAL_EMAIL } from "@/lib/domain/legal";

export const metadata: Metadata = { title: "Termini e condizioni", alternates: { canonical: "/termini" } };

const mail = <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>;
const reasons = REPORT_REASONS.map((r) => r.label.toLowerCase()).join(", ");

export default function TermsPage() {
  return (
    <LegalDraft
      title="Termini e condizioni"
      intro={
        <>
          <p className="font-semibold">In breve</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>
              <strong>GecoItalia mette solo in contatto</strong> chi cerca con agenzie immobiliari, professionisti e artigiani. Non esegue lavori, non vende né affitta
              immobili e non è parte degli accordi tra cliente e azienda.
            </li>
            <li>
              <strong>Se nasce un problema tra cliente e azienda</strong> (lavoro, prezzo, tempi, danni, pagamenti), la responsabilità è delle parti: GecoItalia non ne
              risponde.
            </li>
            <li>Per chi cerca il servizio è gratuito. I prezzi sulle schede sono indicativi: quello vero lo concordi con l&apos;azienda.</li>
            <li>Le aziende pagano un abbonamento e, se vogliono, pacchetti di visibilità. I contenuti sponsorizzati sono sempre indicati.</li>
          </ul>
        </>
      }
      sections={[
        [
          "Chi gestisce il sito e quando valgono questi termini",
          <>
            <p>
              GecoItalia (gecoitalia.it) è gestito da una società in costituzione: ragione sociale, sede e partita IVA saranno indicate qui prima dell&apos;apertura al
              pubblico. Per contattarci: {mail} oppure la pagina <Link href="/assistenza">Assistenza</Link>.
            </p>
            <p>
              Questi termini valgono per chiunque usi il sito. Per creare un account, inviare una richiesta di contatto o registrare un&apos;azienda bisogna accettarli,
              insieme all&apos;<Link href="/privacy">Informativa privacy</Link>. Il servizio è riservato ai maggiorenni.
            </p>
          </>,
        ],
        [
          "Cosa fa GecoItalia, e cosa non fa",
          <>
            <p>
              GecoItalia è una piattaforma che mette in contatto. Mostra le schede delle aziende iscritte e inoltra all&apos;azienda scelta dal cliente la sua richiesta di
              contatto, già confermata via email. Il servizio finisce lì: ogni accordo successivo è solo tra cliente e azienda.
            </p>
            <p>GecoItalia, in particolare:</p>
            <ul>
              <li>non esegue lavori, non fa sopralluoghi né preventivi e non vende, compra o affitta immobili;</li>
              <li>non è un mediatore immobiliare e non è un&apos;agenzia: non riceve provvigioni né compensi su lavori, compravendite o affitti;</li>
              <li>non è parte dei contratti tra cliente e azienda e non agisce per conto di nessuno dei due;</li>
              <li>non incassa e non gestisce i pagamenti tra cliente e azienda;</li>
              <li>non garantisce che un&apos;azienda risponda, accetti un lavoro o lo porti a termine.</li>
            </ul>
          </>,
        ],
        [
          "Responsabilità per i rapporti tra cliente e azienda",
          <>
            <p>
              Poiché GecoItalia si limita a mettere in contatto, <strong>non è responsabile di quello che succede tra cliente e azienda</strong> dopo il contatto. In
              particolare non risponde di:
            </p>
            <ul>
              <li>qualità, tempi, prezzi ed esecuzione dei lavori, dei servizi professionali e dei servizi immobiliari;</li>
              <li>danni a persone o cose, ritardi, lavori non eseguiti o eseguiti male, vizi e garanzie;</li>
              <li>pagamenti, acconti, rimborsi e fatture tra cliente e azienda;</li>
              <li>comportamento, affidabilità e solvibilità delle parti;</li>
              <li>informazioni, prezzi, foto e altri contenuti pubblicati dalle aziende sulle proprie schede, di cui ogni azienda è responsabile.</li>
            </ul>
            <p>
              Per qualsiasi contestazione su un lavoro o un servizio, cliente e azienda si rivolgono l&apos;uno all&apos;altra. GecoItalia non è tenuta a fare da
              mediatore. Se però ci segnali un&apos;azienda che non rispetta questi termini, possiamo controllare e, se serve, sospenderne la scheda.
            </p>
            <p>
              Questi limiti valgono nella misura consentita dalla legge: non escludono la responsabilità di GecoItalia per danni causati da suo dolo o colpa grave (art.
              1229 del Codice civile) e non riducono i diritti che la legge riconosce ai consumatori.
            </p>
          </>,
        ],
        [
          "Come verifichiamo le aziende",
          <p key="verifica">
            Prima di mettere online una scheda il nostro team controlla i dati di registrazione dell&apos;azienda, come la partita IVA e i contatti. È un controllo
            d&apos;identità, non una certificazione: non attesta competenze, qualità del lavoro, abilitazioni, iscrizioni ad albi o registri, licenze o assicurazioni,
            che restano responsabilità dell&apos;azienda. Prima di affidare un lavoro ti consigliamo di chiedere all&apos;azienda i documenti che servono (per esempio
            l&apos;iscrizione al registro degli agenti immobiliari o la dichiarazione di conformità degli impianti).
          </p>,
        ],
        [
          "Per chi cerca",
          <ul key="cerca">
            <li>Il servizio è gratuito e puoi inviare tutte le richieste che vuoi.</li>
            <li>
              La richiesta arriva solo all&apos;azienda che scegli, dopo che l&apos;hai confermata con il codice via email. Scrivi dati veri e una richiesta reale: niente
              spam, richieste a nome di altri o contenuti offensivi.
            </li>
            <li>
              I prezzi pubblicati dalle aziende sono <strong>indicativi e non vincolanti</strong>. Il preventivo definitivo lo concordi con l&apos;azienda.
            </li>
            <li>
              L&apos;ordine dei risultati e i contenuti sponsorizzati sono spiegati in <Link href="/come-ordiniamo-i-risultati">Come ordiniamo i risultati</Link>. I
              contenuti sponsorizzati sono sempre etichettati.
            </li>
          </ul>,
        ],
        [
          "Il tuo account",
          "Tieni per te la password e avvisaci subito se pensi che qualcuno usi il tuo account. Sei responsabile di quello che fai con il tuo account. Puoi eliminarlo quando vuoi dalla tua area, come spiegato nell'Informativa privacy.",
        ],
        [
          "Per le aziende: registrazione e verifica",
          <ul key="registrazione">
            <li>Chi registra un&apos;azienda dichiara di avere il potere di rappresentarla e che i dati inseriti (partita IVA, sede, contatti, fatturazione) sono veri e aggiornati.</li>
            <li>La scheda va online solo quando il piano è attivo e il nostro team ha verificato i dati. Possiamo chiedere documenti e rifiutare una registrazione con dati non verificabili.</li>
            <li>Una partita IVA può avere una sola scheda. Se la tua azienda è già presente, scrivi all&apos;assistenza.</li>
            <li>La sede deve essere in una provincia in cui il servizio è attivo.</li>
          </ul>,
        ],
        [
          "Per le aziende: obblighi",
          <>
            <p>L&apos;azienda si impegna a:</p>
            <ul>
              <li>avere e mantenere le abilitazioni, iscrizioni, licenze e assicurazioni richieste per la sua attività, e rispettare le leggi che la riguardano;</li>
              <li>pubblicare solo informazioni vere: servizi, zone, prezzi indicativi aggiornati, foto di lavori suoi;</li>
              <li>pubblicare solo contenuti di cui ha i diritti, senza dati personali di altri senza il loro permesso;</li>
              <li>
                usare i dati dei clienti che riceve <strong>solo per rispondere alla loro richiesta</strong>: niente pubblicità senza un loro consenso, niente cessione ad
                altri. Per questi dati l&apos;azienda è titolare autonoma del trattamento e risponde lei del rispetto della normativa privacy;
              </li>
              <li>trattare i clienti con correttezza. Gli accordi sul lavoro, i prezzi e i pagamenti sono solo tra azienda e cliente.</li>
            </ul>
            <p>
              L&apos;azienda ci concede di mostrare gratuitamente sul sito i contenuti che pubblica, finché restano sulla scheda. L&apos;azienda tiene indenne GecoItalia
              dalle richieste di terzi nate dai propri contenuti o dal proprio lavoro.
            </p>
          </>,
        ],
        [
          "Per le aziende: abbonamento e pagamenti",
          <ul key="abbonamento">
            <li>
              Piani Base, Normal e Premium, mensili o annuali, ai prezzi IVA esclusa indicati in <Link href="/per-i-professionisti">Per i professionisti</Link> e in Area
              aziende al momento dell&apos;acquisto.
            </li>
            <li>Si paga in anticipo con carta o addebito SEPA tramite Stripe. L&apos;abbonamento si rinnova da solo alla fine di ogni periodo.</li>
            <li>Chi sceglie subito un piano ha {TRIAL_DAYS} giorni di prova: inserisce la carta e, se disdice prima della fine della prova, non paga nulla.</li>
            <li>
              Si disdice quando si vuole da Area aziende → Abbonamento → &laquo;Disdici l&apos;abbonamento&raquo;. Il piano resta attivo fino alla fine del periodo già
              pagato, che non viene rimborsato: fino a quel giorno la scheda è visibile e arrivano le richieste, poi la scheda non compare più sul sito e non ci sono
              altri addebiti. Fino alla scadenza la disdetta si può annullare dalla stessa pagina. I dati dell&apos;azienda restano salvati: per tornare online basta
              scegliere di nuovo un piano. Il titolare riceve una conferma per email.
            </li>
            <li>Il passaggio a un piano inferiore dal portale dei pagamenti vale dal periodo successivo.</li>
            <li>Se un pagamento non va a buon fine la scheda viene sospesa subito e torna online da sola quando il pagamento riesce.</li>
            <li>Le fatture elettroniche sono emesse tramite il Sistema di Interscambio ai dati di fatturazione indicati dall&apos;azienda.</li>
            <li>L&apos;azienda agisce come professionista: non si applica il diritto di recesso di 14 giorni previsto dal Codice del consumo per i consumatori.</li>
          </ul>,
        ],
        [
          "Per le aziende: piano gratuito di lancio",
          <p key="gratuito">
            Chi si registra nei primi 6 mesi dall&apos;apertura del sito e non ha mai avuto un abbonamento può partire senza pagare, con le funzioni del piano Base, finché
            non riceve {FREE_LEADS} richieste in tutto (le richieste segnalate e accolte non contano). Alla {FREE_LEADS}ª richiesta il piano gratuito finisce: la scheda esce
            dai risultati finché l&apos;azienda non sceglie un piano a pagamento. Le richieste confermate insieme all&apos;ultima mostrano i dati del cliente solo dopo la
            scelta del piano. Chi parte dal piano gratuito ha le promo di lancio anche dopo i 6 mesi, ma non i {TRIAL_DAYS} giorni di prova.
          </p>,
        ],
        [
          "Per le aziende: richieste dei clienti",
          <ul key="richieste">
            <li>Le richieste sono gratuite e illimitate con tutti i piani: l&apos;azienda non paga per richiesta.</li>
            <li>Arrivano solo richieste confermate dal cliente via email. I duplicati si annullano in automatico.</li>
            <li>
              Una richiesta si può segnalare entro {REPORT_WINDOW_HOURS} ore dalla consegna, solo per motivi oggettivi: {reasons}. Il nostro team valuta la segnalazione.
            </li>
            <li>GecoItalia non garantisce un numero minimo di richieste né che le richieste diventino lavori.</li>
          </ul>,
        ],
        [
          "Per le aziende: pacchetti di visibilità",
          "Logo in Home, boost nella ricerca ed estensione ad altre province si acquistano in Area aziende, solo con i piani Normal e Premium, ai prezzi IVA esclusa indicati al momento dell'acquisto e con pagamento anticipato. Valgono per la durata indicata, non si rinnovano da soli e, una volta attivati, non sono rimborsabili. I contenuti sponsorizzati sono sempre etichettati come tali.",
        ],
        [
          "Ordinamento dei risultati",
          <p key="ordine">
            I risultati mostrano le aziende della categoria e della zona cercate. Contano il piano dell&apos;azienda e gli eventuali boost acquistati; tra aziende dello
            stesso livello l&apos;ordine ruota a ogni visitatore. Tutti i dettagli sono in <Link href="/come-ordiniamo-i-risultati">Come ordiniamo i risultati</Link>.
          </p>,
        ],
        [
          "Sospensione e chiusura della scheda",
          <>
            <p>Possiamo sospendere o limitare una scheda, o chiudere un account, se:</p>
            <ul>
              <li>i dati dell&apos;azienda sono falsi o non superano la verifica;</li>
              <li>l&apos;azienda non rispetta questi termini, pubblica contenuti illeciti o ingannevoli o usa male i dati dei clienti;</li>
              <li>riceviamo segnalazioni gravi e fondate sul suo comportamento;</li>
              <li>un pagamento non va a buon fine;</li>
              <li>lo chiede la legge o un&apos;autorità.</li>
            </ul>
            <p>
              Spieghiamo i motivi per email, prima o al momento della sospensione. Per chiudere definitivamente un account diamo almeno 30 giorni di preavviso, salvo
              violazioni gravi o obblighi di legge. L&apos;azienda può contestare la decisione scrivendo all&apos;assistenza.
            </p>
          </>,
        ],
        [
          "Disponibilità del sito",
          "Facciamo il possibile perché il sito funzioni sempre, ma possono esserci interruzioni per manutenzione o guasti. Non rispondiamo dei disagi dovuti a interruzioni brevi o non dipendenti da noi, nei limiti consentiti dalla legge.",
        ],
        [
          "Reclami",
          <p key="reclami">
            Per reclami sul servizio di GecoItalia scrivi dalla pagina <Link href="/assistenza">Assistenza</Link> o a {mail}. Rispondiamo il prima possibile e comunque
            entro 30 giorni.
          </p>,
        ],
        [
          "Modifiche ai termini",
          "Possiamo aggiornare questi termini: la data in alto indica l'ultima versione. Alle aziende iscritte comunichiamo le modifiche per email almeno 15 giorni prima che entrino in vigore, salvo obblighi di legge. Chi non le accetta può disdire prima di quella data.",
        ],
        [
          "Legge applicabile e foro",
          "Questi termini sono regolati dalla legge italiana. Per i consumatori è competente il foro del luogo in cui risiedono. Per le aziende è competente il foro della sede del gestore del sito, che sarà indicata qui con i dati della società.",
        ],
      ]}
    >
      <MediaCredits />
    </LegalDraft>
  );
}
