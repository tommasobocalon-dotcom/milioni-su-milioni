# Attivare i servizi esterni: recensioni Google, email, antispam

Il codice di queste tre funzioni è già pronto e testato. Restano **spente** finché non si inseriscono le chiavi dei servizi esterni: senza chiavi il sito funziona lo stesso, solo senza quella funzione.

| Funzione | Servizio | Cosa succede senza chiavi | Costo indicativo |
|---|---|---|---|
| Recensioni Google sulla scheda dei partner | Google Cloud, Places API (New) | Sezione nascosta; nell'Area Partner il collegamento è disattivato | Pay-as-you-go con quota gratuita mensile, carta obbligatoria |
| Email (conferma account, recupero password) | Resend | Le email vengono stampate nel terminale; sul sito di prova il link si vede a schermo | Gratis fino a 3.000 email al mese |
| Antispam su richiesta di contatto, registrazione e recupero password | Cloudflare Turnstile | Nessun controllo antispam (restano i limiti per IP) | Gratis |

I prezzi cambiano: controllali sulle pagine ufficiali prima di attivare.

**Ordine consigliato:** prima Turnstile (5 minuti, gratis), poi Resend (serve modificare il DNS su Aruba), infine Google (serve la carta).

Le variabili si inseriscono in due posti:
- **In locale:** nel file `.env.local` nella cartella del progetto. Poi va riavviato `npm run dev`.
- **Online (sito di prova e produzione):** su Vercel → progetto → **Settings → Environment Variables**. Poi **Deployments → ⋯ → Redeploy** sull'ultimo deploy: le variabili nuove valgono solo dopo un nuovo deploy.

---

## 1. Antispam: Cloudflare Turnstile

Turnstile controlla che chi invia un modulo sia una persona. Di solito non chiede nulla all'utente: compare una casella solo se il traffico sembra sospetto. Serve soprattutto sulla richiesta di contatto, perché ogni richiesta fa partire un SMS a pagamento.

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
Attenzione: la Site Key entra nel codice della pagina al momento della build. Dopo averla aggiunta su Vercel serve **per forza** un Redeploy.

### Passo 1.3 — Verificare
1. Apri una scheda partner e avvia una richiesta di contatto fino al passo "I tuoi contatti".
2. Invia: deve arrivare al passo di verifica SMS senza errori.
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

## 3. Recensioni Google: Places API (New)

Il partner collega la sua scheda Google Maps dall'Area Partner. Sulla sua scheda pubblica compaiono voto, numero di recensioni e le ultime cinque recensioni, con il link a Google Maps.

**Regole di Google già rispettate dal codice:**
- nel database si salva solo il codice della scheda Google (place ID), mai le recensioni;
- le recensioni restano solo qualche ora nella cache del server, poi si rileggono da Google;
- ogni recensione mostra autore, foto e link, e la sezione porta la scritta "Google Maps";
- Google restituisce **al massimo 5 recensioni**, le "più pertinenti": per leggerle tutte si va su Google Maps;
- voti e recensioni Google non vanno mostrati su una mappa non Google (la futura mappa MapLibre non li userà).

### Passo 3.1 — Account di fatturazione (lo fai tu: serve la carta)
1. Vai su https://console.cloud.google.com/billing.
2. **Crea account** → nome `geco` → paese Italia → inserisci i dati e la carta.
3. Google applica una quota gratuita mensile per ogni tipo di chiamata; oltre quella si paga a consumo. Le recensioni rientrano nella fascia più cara (*Place Details Enterprise + Atmosphere*): controlla il prezzo aggiornato su https://mapsplatform.google.com/pricing.

### Passo 3.2 — Progetto
1. In alto, nel selettore dei progetti → **Nuovo progetto**.
2. Nome `geco`, account di fatturazione `geco` → **Crea**.
3. Assicurati che in alto sia selezionato il progetto `geco` (non quelli di n8n).

### Passo 3.3 — Attivare l'API giusta
1. Menu → **API e servizi → Libreria**.
2. Cerca **Places API (New)**. Attenzione: esiste anche la vecchia "Places API", che il codice non usa.
3. Apri **Places API (New)** → **Abilita**.

### Passo 3.4 — Creare la chiave
1. **API e servizi → Credenziali → Crea credenziali → Chiave API**.
2. Appena creata, premi **Modifica chiave**:
   - **Nome:** `geco-server`
   - **Restrizioni dell'applicazione:** *Nessuna*. La chiave è usata solo dal server, che su Vercel non ha un IP fisso. Restrizioni per sito web (referrer) bloccherebbero le chiamate del server.
   - **Restrizioni API:** **Limita chiave** → seleziona solo **Places API (New)**.
3. **Salva** e copia la chiave.

Non mettere mai questa chiave in una variabile che inizia con `NEXT_PUBLIC_`: finirebbe nel codice della pagina, visibile a tutti.

### Passo 3.5 — Mettere un tetto alla spesa (consigliato)
1. **Fatturazione → Budget e avvisi → Crea budget**: per esempio 20 € al mese, con avvisi al 50%, 90% e 100%. Il budget avvisa ma non blocca.
2. Per bloccare davvero: **API e servizi → Places API (New) → Quote e limiti di sistema**. Abbassa le richieste al giorno di *Place Details* (es. 1.000) e di *Text Search* (es. 200). Oltre il limite Google risponde con un errore e la sezione recensioni semplicemente non compare.

### Passo 3.6 — Inserire la chiave
```
GOOGLE_PLACES_API_KEY=<chiave>
```

### Passo 3.7 — Verificare
1. Entra nell'Area Partner con un account azienda → **La mia scheda**.
2. Nel riquadro **Recensioni Google** il campo di ricerca è già compilato con nome e comune: premi **Cerca**.
3. Accanto all'attività giusta premi **È la mia attività**. Il riquadro mostra "Collegata: X su 5 con N recensioni".
4. Premi **Vedi sulla scheda**: nella scheda pubblica c'è la sezione **Recensioni su Google**.
5. Per togliere il collegamento: **Scollega**.

Ogni collegamento e scollegamento viene registrato (tabella `audit_logs`, azioni `partner.google_linked` e `partner.google_unlinked`). Servirà al Backoffice per controllare che nessun partner colleghi la scheda Google di un altro.

---

## Problemi frequenti

| Sintomo | Causa probabile | Cosa fare |
|---|---|---|
| "Non siamo riusciti a verificare che tu non sia un programma automatico" | Site Key e Secret Key di widget diversi, oppure dominio non tra gli Hostnames del widget | Ricontrolla le due chiavi e gli Hostnames su Cloudflare, poi Redeploy |
| Il widget Turnstile non compare per niente | La Site Key è stata aggiunta dopo l'ultima build | Redeploy su Vercel |
| L'email non arriva | Dominio non ancora verificato su Resend, oppure `EMAIL_PROVIDER` non è `resend` | Su Resend → Domains tutte le righe devono essere verdi; su Resend → Logs si vede ogni invio con l'eventuale errore |
| L'email arriva nello spam | Manca il record DMARC o il dominio è appena verificato | Aggiungi `_dmarc` (Passo 2.2); i primi giorni capita |
| I link nelle email portano a `localhost` | `APP_URL` mancante o sbagliata | Imposta `APP_URL=https://gecoitalia.it` e fai Redeploy |
| Nell'Area Partner: "Il collegamento con Google non è ancora attivo" | Manca `GOOGLE_PLACES_API_KEY` | Passo 3.6, poi Redeploy |
| La ricerca Google non trova nulla o la sezione non compare | API sbagliata abilitata, restrizioni della chiave errate, fatturazione non attiva o quota finita | Nei log di Vercel cerca le righe `[google] Places API` con il codice di errore: 403 = chiave o API, 429 = quota |
| Recensioni cambiate su Google ma non ancora sulla scheda | Cache del server di qualche ora | È normale: si aggiornano da sole |

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

# Recensioni Google
GOOGLE_PLACES_API_KEY=
```

Le stesse variabili, con una riga di spiegazione, sono anche in [.env.example](.env.example). Per database, Vercel, dominio e Stripe vedi [DEPLOY.md](DEPLOY.md).
