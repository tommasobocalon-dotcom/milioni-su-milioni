# Attivare i servizi esterni: email, antispam, assistenza

Il codice di queste funzioni è già pronto e testato. Restano **spente** finché non si inseriscono le chiavi dei servizi esterni: senza chiavi il sito funziona lo stesso, solo senza quella funzione.

| Funzione | Servizio | Cosa succede senza chiavi | Costo indicativo |
|---|---|---|---|
| Email (conferma account, recupero password) | Resend | Le email vengono stampate nel terminale; sul sito di prova il link si vede a schermo | Gratis fino a 3.000 email al mese |
| Antispam su richiesta di contatto, registrazione e recupero password | Cloudflare Turnstile | Nessun controllo antispam (restano i limiti per IP) | Gratis |
| Email di assistenza che entrano da sole nel gestionale | Resend Inbound (oppure Postmark) | Le richieste arrivano lo stesso dal modulo del sito e dall'Area Partner; quelle per email restano nella casella | Incluso nel piano Resend (verificare i limiti) |

I prezzi cambiano: controllali sulle pagine ufficiali prima di attivare.

**Ordine consigliato:** prima Turnstile (5 minuti, gratis), poi Resend (serve modificare il DNS su Aruba), infine Google (serve la carta).

Le variabili si inseriscono in due posti:
- **In locale:** nel file `.env.local` nella cartella del progetto. Poi va riavviato `npm run dev`.
- **Online (sito di prova e produzione):** su Vercel → progetto → **Settings → Environment Variables**. Poi **Deployments → ⋯ → Redeploy** sull'ultimo deploy: le variabili nuove valgono solo dopo un nuovo deploy.

---

## 1. Antispam: Cloudflare Turnstile

Turnstile controlla che chi invia un modulo sia una persona. Di solito non chiede nulla all'utente: compare una casella solo se il traffico sembra sospetto. Serve soprattutto sulla richiesta di contatto, perché ogni richiesta fa partire un'email con il codice di conferma.

### Passo 1.1 — Creare il widget
1. Vai su https://dash.cloudflare.com e accedi (o crea un account gratuito). Non serve spostare il dominio su Cloudflare.
2. Nel menu a sinistra apri **Turnstile** → **Add widget**.
3. Compila:
   - **Widget name:** `geco`
   - **Hostnames:** `gecoitalia.it` (aggiungi anche `localhost` se vuoi provarlo in locale)
   - **Widget mode:** **Managed**
4. Premi **Create**. Cloudflare mostra due chiavi: **Site Key** (pubblica) e **Secret Key** (segreta).

### Passo 1.2 — Inserire le chiavi
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<Site Key>
TURNSTILE_SECRET_KEY=<Secret Key>
```
Su Vercel la Site Key va salvata come tipo **Config**, non Secret: Vercel rifiuta le variabili `NEXT_PUBLIC_` di tipo Secret, perché finiscono nel browser. La Secret Key resta di tipo **Secret**. Entrambe solo in **Production**: i deploy di anteprima (`*.vercel.app`) non sono tra gli host del widget.
Attenzione: la Site Key entra nel codice della pagina al momento della build. Dopo averla aggiunta su Vercel serve **per forza** un Redeploy.

### Passo 1.3 — Verificare
1. Apri una scheda partner e avvia una richiesta di contatto fino al passo "I tuoi contatti".
2. Invia: deve arrivare al passo del codice via email senza errori.
3. Se compare "Non siamo riusciti a verificare che tu non sia un programma automatico", vedi *Problemi frequenti*.

> Per provare in locale senza un widget vero, Cloudflare dà chiavi di prova che passano sempre:
> `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` e `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`.

---

## 2. Email: Resend

Servono per il link di conferma dell'email alla registrazione e per il recupero della password.

### Passo 2.1 — Account e dominio
1. Vai su https://resend.com e crea un account.
2. **Domains → Add Domain**: scrivi `gecoitalia.it` e come regione scegli **Ireland (eu-west-1)**, così i dati restano in UE.
3. Resend mostra alcuni record DNS da aggiungere (di solito un TXT per SPF, un TXT per DKIM e un MX per le risposte di errore). Lascia la pagina aperta.

### Passo 2.2 — Record DNS su Aruba
1. Accedi all'area clienti di Aruba → **Gestione domini** → `gecoitalia.it` → **Gestione DNS**.
2. Per ogni riga mostrata da Resend aggiungi un record con **lo stesso tipo, nome e valore**. Copia i valori con il tasto di copia di Resend: un carattere sbagliato basta a farlo fallire.
3. Consigliato: aggiungi anche un record DMARC, cioè un TXT con nome `_dmarc` e valore `v=DMARC1; p=none;`. Senza, alcune caselle (Gmail, Outlook) mettono più facilmente le email nello spam.
4. Torna su Resend e premi **Verify DNS Records**. La propagazione può richiedere da pochi minuti a qualche ora; quando tutte le righe sono verdi il dominio è pronto.

### Passo 2.3 — Chiave API
1. Su Resend apri **API Keys → Create API Key**.
2. Nome `geco-produzione`, permesso **Sending access**, dominio `gecoitalia.it`.
3. Copia la chiave (inizia con `re_`): Resend la mostra una volta sola.

### Passo 2.4 — Inserire le variabili
```
EMAIL_PROVIDER=resend
RESEND_API_KEY=<chiave re_...>
EMAIL_FROM=geco <noreply@gecoitalia.it>
APP_URL=https://gecoitalia.it
```
`APP_URL` deve essere l'indirizzo vero del sito: i link nelle email vengono costruiti da lì. Con `localhost` le email arriverebbero con link che non si aprono.

### Passo 2.5 — Verificare
1. Crea un account con una tua email vera da `/accedi` → **Crea account**.
2. Deve arrivare l'email "Conferma la tua email su geco". Apri il link: nell'area personale l'avviso blu "Conferma la tua email" sparisce.
3. Esci, vai su `/accedi` → **Password dimenticata?**, inserisci la stessa email: deve arrivare "Scegli una nuova password per geco". Il link vale un'ora e una volta sola.

Con `EMAIL_PROVIDER=console` (o vuoto) le email non partono: vengono stampate nel terminale di `npm run dev` e, in locale o sul sito di prova, il link compare anche a schermo.

---

## 3. Recensioni Google (tolte)

Le recensioni, comprese quelle Google, sono state tolte dal sito l'11/11/2026: `GOOGLE_PLACES_API_KEY` non serve più e su Vercel si può cancellare.

## 4. Gestionale e assistenza

Il gestionale è un'app a sé su `admin.gecoitalia.it` (oppure `/admin` del sito finché il dominio non è configurato: DEPLOY.md, passo 4b). Usa lo stesso database del sito: non va collegato a niente. Le richieste di assistenza ci arrivano da tre strade:

1. il modulo pubblico `/assistenza` (link "Assistenza" nel footer);
2. l'Area Partner → **Assistenza** (il partner vede anche le risposte);
3. le email scritte alla casella dell'assistenza, **solo dopo il Passo 4.3**.

Ogni risposta data dal gestionale parte per email con `[geco #N]` nell'oggetto: quando il cliente risponde, il messaggio torna sullo stesso ticket.

### Passo 4.1 — Chi entra nel gestionale
Su Vercel aggiungi la tua email (più indirizzi separati da virgola):
```
ADMIN_EMAILS=tuaemail@esempio.it
```
Poi registrati sul sito (`/accedi`) con quella email e **conferma l'email** dal link che ti arriva: senza conferma il gestionale resta chiuso, così nessuno può spacciarsi per te registrandosi con il tuo indirizzo. Poi entra dalla pagina del gestionale (`admin.gecoitalia.it`, oppure `/admin/accedi`) con email e password.

In locale e sul sito di prova (con `SITE_ACCESS` e `DEMO_MODE=1`) c'è già l'amministratore `admin@gecoitalia.it`, password `geco-demo-2026`: viene creato al deploy e sparisce dal processo quando, al lancio, si toglie `npm run db:seed` (DEPLOY.md). Prima del lancio cancellalo dal database.

### Passo 4.2 — Indirizzo dell'assistenza e avvisi
```
SUPPORT_EMAIL=gecoassistenza@gmail.com
```
- `SUPPORT_EMAIL` (dal 20/11/2026 `gecoassistenza@gmail.com`, anche valore predefinito nel codice) è l'indirizzo mostrato sul sito, il "rispondi a" di tutte le email dell'assistenza e la casella che riceve un avviso con il link al ticket a ogni nuova richiesta o risposta di un cliente. Ci arriva solo l'assistenza: gli allarmi vanno ad `ALERT_EMAILS`.
- `SUPPORT_ALERT_EMAIL` (facoltativa) manda quegli avvisi a un'altra casella al posto di `SUPPORT_EMAIL`.
- `ALERT_EMAILS` (facoltativa, più indirizzi separati da virgola) riceve gli **allarmi**: webhook Stripe non elaborato, pagamento o addebito SEPA non riuscito, codice delle richieste non inviato ai clienti. Senza, vanno ad `ADMIN_EMAILS`, altrimenti a info@gecoitalia.it. Lo stesso allarme arriva al massimo ogni 10 minuti; partono con Brevo, quindi se è Brevo a non funzionare restano solo nei log di Vercel.

### Passo 4.3 — Far entrare le email nel gestionale
La casella `SUPPORT_EMAIL` deve inoltrare ogni email al gestionale. Il modo più semplice, senza toccare la posta che già usi su Aruba:

**Con Resend (consigliato, è già il servizio delle email in uscita)**
1. Su Resend apri **Receiving** (ricezione) e segui le istruzioni per avere un indirizzo di ricezione: un sottodominio come `in.gecoitalia.it` con il record MX che Resend ti indica su Aruba, oppure l'indirizzo che Resend ti assegna.
2. Su Resend apri **Webhooks → Add endpoint**: URL `https://gecoitalia.it/api/assistenza/email`, evento `email.received`. Copia il **Signing secret** (inizia con `whsec_`).
3. Su Vercel:
   ```
   RESEND_INBOUND_SECRET=<whsec_...>
   ```
   Il testo delle email si legge con `RESEND_API_KEY`: se nei log di Vercel compare `[assistenza] email Resend non letta` con errore 401 o 403, la chiave ha solo "Sending access": creane una con accesso completo e sostituiscila.
4. Su Gmail (Impostazioni → Inoltro e POP/IMAP) inoltra `gecoassistenza@gmail.com` all'indirizzo di ricezione del punto 1, lasciando una copia nella casella.

**Con Postmark (alternativa)**
1. Su Postmark crea un server e apri **Default Inbound Stream**: ti dà un indirizzo `…@inbound.postmarkapp.com`.
2. Come *Webhook URL* metti `https://gecoitalia.it/api/assistenza/email?token=<una stringa casuale lunga>`.
3. Su Vercel: `INBOUND_EMAIL_TOKEN=<la stessa stringa>`.
4. Su Gmail inoltra `gecoassistenza@gmail.com` all'indirizzo di Postmark.

Il percorso del webhook è escluso dalla password del sito di prova: è protetto dalla firma (Resend) o dal token (Postmark).

### Passo 4.4 — Verificare
1. Scrivi da una tua casella personale a `gecoassistenza@gmail.com`.
2. In `/admin/assistenza` deve comparire una nuova richiesta "Email", e alla tua casella arriva la conferma con il numero `[geco #N]`.
3. Rispondi dal gestionale: la risposta arriva per email. Rispondi a quella email: il messaggio si aggiunge allo stesso ticket, senza la parte citata.

Le email da indirizzi automatici (noreply, rimbalzi) e dai nostri stessi indirizzi vengono ignorate, per non creare catene infinite di risposte automatiche. La stessa email consegnata due volte conta una volta sola.

---

## Problemi frequenti

| Sintomo | Causa probabile | Cosa fare |
|---|---|---|
| "Non siamo riusciti a verificare che tu non sia un programma automatico" | Site Key e Secret Key di widget diversi, oppure dominio non tra gli Hostnames del widget | Ricontrolla le due chiavi e gli Hostnames su Cloudflare, poi Redeploy |
| Il widget Turnstile non compare per niente | La Site Key è stata aggiunta dopo l'ultima build | Redeploy su Vercel |
| L'email non arriva | Dominio non ancora verificato su Resend, oppure `EMAIL_PROVIDER` non è `resend` | Su Resend → Domains tutte le righe devono essere verdi; su Resend → Logs si vede ogni invio con l'eventuale errore |
| L'email arriva nello spam | Manca il record DMARC o il dominio è appena verificato | Aggiungi `_dmarc` (Passo 2.2); i primi giorni capita |
| I link nelle email portano a `localhost` | `APP_URL` mancante o sbagliata | Imposta `APP_URL=https://gecoitalia.it` e fai Redeploy |
| `/admin` mostra "Questa pagina non c'è" | La tua email non è in `ADMIN_EMAILS` o non è ancora confermata | Passo 4.1, poi Redeploy |
| Le email all'assistenza non compaiono nel gestionale | Inoltro non attivo, webhook sbagliato o segreto diverso | Su Resend/Postmark guarda i tentativi del webhook: 400 = firma, 401 = token, 503 = variabile mancante su Vercel |

---

## Riepilogo delle variabili

```
# Antispam
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Email
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM=geco <noreply@gecoitalia.it>
APP_URL=https://gecoitalia.it

# Gestionale e assistenza
ADMIN_EMAILS=
SUPPORT_EMAIL=gecoassistenza@gmail.com
SUPPORT_ALERT_EMAIL=
ALERT_EMAILS=
RESEND_INBOUND_SECRET=
INBOUND_EMAIL_TOKEN=
```

Le stesse variabili, con una riga di spiegazione, sono anche in [.env.example](.env.example). Per database, Vercel, dominio e Stripe vedi [DEPLOY.md](DEPLOY.md).
