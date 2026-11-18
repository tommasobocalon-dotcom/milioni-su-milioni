# Sito di prova su gecoitalia.it

Il sito va online su **https://gecoitalia.it**, ma visibile **solo al team**. Il browser chiede nome e password prima di mostrare qualsiasi pagina. Chi non ha le credenziali vede solo "Sito di prova riservato al team" e i motori di ricerca non indicizzano nulla.

Servizi usati (come da CLAUDE.md):

| Cosa | Dove | Costo |
|---|---|---|
| Sito (Next.js) | Vercel, regione Francoforte | Hobby gratis, ma **solo per uso non commerciale**. Per un progetto per un cliente Vercel chiede il piano Pro (20 $/mese) |
| Database | Supabase, regione Francoforte (UE) | Free: 0 €. Il progetto va in pausa dopo 7 giorni senza visite e si riattiva dal pannello |
| Dominio | Aruba (già acquistato) | — |

Come funziona la protezione: [src/proxy.ts](src/proxy.ts) legge la variabile `SITE_ACCESS`. Se è impostata, ogni richiesta richiede nome e password (HTTP Basic Auth); se è vuota, il sito è aperto. Con `DEMO_MODE=1` (e solo se il sito è protetto) i codici delle richieste compaiono a schermo e la pagina di accesso mostra l'account di prova, come in locale.

---

## Passo 1 — Database su Supabase

> **Il sito online oggi** (dal 18/11/2026) gira sull'account Vercel **info@gecoitalia.it** (team "GecoItalia",
> `geco-italia`, piano Hobby, progetto `geco`) e usa il database Supabase **`gecoitalia`** (ref
> `jemsdfbpwuacfatququz`, Francoforte, Free) dell'account Supabase info@gecoitalia.it, organizzazione "tommaso".
> Variabili impostate a mano su Vercel: `DATABASE_URL` (pooler transaction, porta 6543), `SUPABASE_URL`,
> `SUPABASE_SERVICE_ROLE_KEY`. Bucket pubblico `uploads` (5 MB a file) e `STORAGE_PROVIDER=supabase`.
> Prima del 18/11 sito e database stavano nel team Vercel "Alvise Marchi's projects" (database
> `supabase-teal-engine` del Marketplace): copiati con `pg_dump`/`pg_restore` (schemi `public` e `drizzle`,
> ruolo `geco_partner` creato prima), cron del vecchio progetto spento.
> I passi qui sotto servono solo per un nuovo ambiente.

1. Vai su https://supabase.com e accedi con **GitHub** (lo stesso account del repository).
2. **New project**:
   - Name: `geco-prova`
   - Database password: premi **Generate a password** e salvala in un posto sicuro. Se la scrivi tu, usa **solo lettere e numeri**: i simboli vanno codificati nell'URL e creano errori.
   - Region: **Central EU (Frankfurt)**.
   - Se tra le opzioni c'è **Enable Data API**, **toglila**: l'app parla direttamente con il database e non usa quell'API. Se non la vedi, dopo la creazione vai in **Project Settings → Data API** e disattivala.
3. A progetto pronto, premi **Connect** in alto. Nella sezione **Transaction pooler** copia l'URI, che ha questa forma:
   ```
   postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
   Sostituisci `[YOUR-PASSWORD]` (parentesi comprese) con la password del punto 2. Questa stringa è il valore di `DATABASE_URL`.

Non serve creare tabelle a mano: le crea Vercel al primo deploy (vedi [vercel.json](vercel.json): migrazioni, poi dati di esempio se il database è vuoto, poi build).

## Passo 2 — Preparare i segreti

Nel terminale, nella cartella del progetto, genera due valori casuali.

Segreto per i codici OTP (`OTP_PEPPER`):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Una password per ogni membro del team (lancia il comando una volta per persona):

```powershell
node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"
```

Poi componi `SITE_ACCESS` così, con nome e password separati da due punti e le persone separate da virgola, senza spazi:

```
tommaso:Xk3...,cliente:Pq9...,socio:Lm2...
```

## Passo 3 — Pubblicare su Vercel

1. Vai su https://vercel.com e accedi con **GitHub**. Scegli il piano (vedi tabella sopra).
2. **Add New… → Project**. Autorizza Vercel a leggere il repository `tommasobocalon-dotcom/milioni-su-milioni` e premi **Import**.
3. Framework: Next.js (rilevato da solo). Non toccare *Build Command*: lo prende da `vercel.json`.
4. Apri **Environment Variables** e inserisci:

   | Nome | Valore |
   |---|---|
   | `DATABASE_URL` | URI di Supabase del passo 1 |
   | `OTP_PEPPER` | segreto del passo 2 |
   | `APP_URL` | `https://gecoitalia.it` |
   | `EMAIL_PROVIDER` | `console` |
   | `SITE_ACCESS` | accessi del team del passo 2 |
   | `DEMO_MODE` | `1` |

5. **Deploy**. La prima build dura qualche minuto: crea le tabelle su Supabase, carica i dati di esempio e compila il sito.
6. Al termine, apri l'indirizzo `https://<nome-progetto>.vercel.app` che Vercel ti mostra. Il browser deve chiedere nome e password: inserisci uno degli accessi di `SITE_ACCESS`.

Da qui in poi **ogni `git push` su `main` pubblica automaticamente** una nuova versione. Le migrazioni vengono applicate a ogni deploy.

## Passo 4 — Collegare gecoitalia.it (Vercel + Aruba)

**Su Vercel**
1. Nel progetto: **Settings → Domains → Add** e scrivi `gecoitalia.it`.
2. Accetta l'opzione consigliata: `gecoitalia.it` come dominio principale e `www.gecoitalia.it` che rimanda lì.
3. Vercel mostra i record DNS da creare. Di solito sono:
   - un record **A** per `gecoitalia.it` (nome `@`) con un indirizzo IP;
   - un record **CNAME** per `www` con un valore che finisce in `vercel-dns.com` (o simile).

   Usa **esattamente i valori che vedi su Vercel**, non quelli di esempio.

**Su Aruba**
1. Accedi all'Area Clienti su https://www.aruba.it, apri il **Pannello di controllo** e scegli il dominio `gecoitalia.it`.
2. Apri la gestione DNS (la voce si chiama **Gestione DNS e puntamenti** o **DNS**).
3. Record **A** del dominio principale (`gecoitalia.it` o `@`): **modificalo** e metti l'IP indicato da Vercel.
4. `www`: se esiste già un record **A** per `www`, **eliminalo**. Poi aggiungi un record **CNAME** con nome `www` e il valore indicato da Vercel (se Aruba lo chiede, con il punto finale).
5. Se ci sono record **AAAA** (IPv6) per `@` o `www`, **eliminali**: altrimenti alcune persone finirebbero ancora sulla pagina di Aruba.
6. **Non toccare** i record **MX** e quelli legati alla posta (`mail`, `pop`, `smtp`, `imap`, `autodiscover`) se usi l'email di Aruba.
7. Salva.

La propagazione richiede da pochi minuti a qualche ora. Quando su Vercel i domini risultano **Valid Configuration**, il certificato HTTPS viene creato da solo e https://gecoitalia.it è attivo.

## Passo 4b — Il gestionale su admin.gecoitalia.it (app separata)

Finché questo passo non è fatto, il gestionale è su `gecoitalia.it/admin`. Dopo, vive solo su `admin.gecoitalia.it` e dal sito `/admin` sparisce (pagina 404). Stessi dati e stesso deploy: non c'è niente da sincronizzare.

**Su Vercel**
1. **Settings → Domains → Add** e scrivi `admin.gecoitalia.it`. Vercel mostra un record **CNAME** da creare (nome `admin`, valore che finisce in `vercel-dns.com` o simile).
2. **Settings → Environment Variables**: aggiungi `ADMIN_URL` = `https://admin.gecoitalia.it` (e controlla che `APP_URL` sia `https://gecoitalia.it`).
3. **Deployments → ⋯ → Redeploy** sull'ultimo deploy.

**Su Aruba**
1. Gestione DNS di `gecoitalia.it` → aggiungi un record **CNAME** con nome `admin` e **il valore indicato da Vercel**. Non toccare gli altri record.

Quando su Vercel `admin.gecoitalia.it` risulta **Valid Configuration**, apri https://admin.gecoitalia.it: si apre la pagina di accesso del gestionale. Sul sito di prova il browser chiede prima nome e password del team (`SITE_ACCESS`), come sul sito.

**Installarlo come app** (icona sul desktop o sul telefono, finestra propria senza barra degli indirizzi):
- **Chrome o Edge sul computer:** apri admin.gecoitalia.it e premi l'icona **Installa** a destra nella barra degli indirizzi (oppure menu ⋮ → *Trasmetti, salva e condividi* → *Installa pagina come app*).
- **Android (Chrome):** menu ⋮ → **Installa app** / **Aggiungi a schermata Home**.
- **iPhone (Safari):** tasto **Condividi** → **Aggiungi alla schermata Home**.

Note:
- L'accesso al gestionale è separato da quello del sito: si entra con email e password dalla sua pagina (`/admin/accedi`). Google e Apple lì non ci sono: chi ha un account nato con Google si crea una password con *Password dimenticata?*.
- Chi è amministratore e accede **sul sito** resta lì un utente normale: il gestionale si apre solo dal suo indirizzo.

## Passo 5 — Dare l'accesso al team

Manda a ogni persona:
- il link https://gecoitalia.it;
- il **suo** nome e la **sua** password (finestra del browser "Accedi");
- per provare l'Area Partner: l'account di prova mostrato nella pagina **Accedi**;
- per provare una richiesta di contatto: il codice compare a schermo, non serve una casella email vera.

**Aggiungere o togliere una persona:** su Vercel modifica `SITE_ACCESS` (Settings → Environment Variables), poi **Deployments → ⋯ → Redeploy** sull'ultimo deploy. Le variabili cambiate valgono solo dopo un nuovo deploy.

## Cosa non funziona ancora sul sito di prova

- **Caricamento foto** (logo, portfolio, foto profilo): in locale le foto vanno su disco, ma su Vercel il disco è di sola lettura. Serve Supabase Storage.
- **Le email** non partono finché `EMAIL_PROVIDER` resta `console`: i codici delle richieste compaiono a schermo (`DEMO_MODE`). Per l'invio vero vedi "Email con Brevo".
- **Accesso con Google/Apple**: funziona solo dopo aver inserito le variabili `GOOGLE_*` / `APPLE_*` su Vercel, con URI di ritorno `https://gecoitalia.it/auth/google/callback` e `https://gecoitalia.it/auth/apple/callback`.
- **Pagamenti Stripe**: spenti finché non imposti le variabili `STRIPE_*` (vedi sotto); fino ad allora piani e pacchetti si attivano senza pagamento (solo sito di prova).
- **Email vere e antispam Turnstile**: spenti finché non imposti le chiavi, passo passo in [ATTIVAZIONE-SERVIZI.md](ATTIVAZIONE-SERVIZI.md).
- I dati sono **di esempio** (partner inventati): vanno bene finché il sito è riservato al team, **non al lancio** (PRD §5.6).

## Email con Brevo

Un account [Brevo](https://www.brevo.com) per tutte le email: il codice con cui il cliente conferma la richiesta (dal 14/11/2026 niente più SMS), la conferma al cliente e l'avviso di nuova richiesta al partner.

1. **Account.** Registrati su https://app.brevo.com con i dati dell'azienda.
2. **Chiave API.** In alto a destra: nome account → **SMTP e API** → scheda **Chiavi API** → **Genera una nuova chiave API**. Copiala in `BREVO_API_KEY` (in `.env.local` per provare in locale, su Vercel per il sito). È segreta: non va mai nel codice né in chat.
3. **Dominio per le email.** **Mittenti, domini e IP dedicati → Domini → Aggiungi un dominio**: `gecoitalia.it`. Brevo mostra alcuni record DNS (codice Brevo, DKIM, DMARC). Su Aruba: **Pannello di controllo → Gestione Domini → gecoitalia.it → Gestione DNS** aggiungi i record così come li mostra Brevo, poi premi **Verifica** su Brevo (può volerci qualche ora). Poi in **Mittenti** aggiungi `info@gecoitalia.it` con nome `geco`.
   Senza questi record le email finiscono nello spam o non partono.
4. **Variabili.** In `.env.local` (prova in locale) o su Vercel (poi **Redeploy**):

   | Nome | Valore |
   |---|---|
   | `EMAIL_PROVIDER` | `brevo` |
   | `BREVO_API_KEY` | chiave del punto 2 |
   | `EMAIL_FROM` | `info@gecoitalia.it` |

**Da sapere:**
- Con `EMAIL_PROVIDER=brevo` i codici **non compaiono più a schermo**, nemmeno sul sito di prova: arrivano solo nella casella del cliente.
- Se Brevo non risponde, il cliente vede "Non riusciamo a inviare l'email con il codice in questo momento" e l'errore resta nei log di Vercel (`[codice]`). Le email dopo la conferma non bloccano mai la richiesta: se non partono restano solo nei log (`[email]`).
- Controlla gli invii in Brevo: **Transazionale → Log**.

## Pagamenti con Stripe

Abbonamenti (mensile o annuale), pacchetti in euro e portale clienti passano da Stripe. Sul sito di prova usa **solo la modalità test** (chiavi `sk_test_...`): nessun addebito vero, carta di prova `4242 4242 4242 4242`.

1. **Account e metodi di pagamento.** Su https://dashboard.stripe.com usa la *sandbox* (modalità test). In **Settings → Payment methods** attiva *SEPA Direct Debit* (la carta è già attiva): il Checkout offre solo carta e SEPA, anche se nel Dashboard ci sono altri metodi.
2. **Chiave segreta.** **Developers → API keys**: copia la *Secret key* (`sk_test_...`) in `.env.local` come `STRIPE_SECRET_KEY=...`. Mai in `.env.example` (va su GitHub) e mai in chat.
3. **Configurazione automatica.** Nel terminale:
   ```
   npm run stripe:setup
   ```
   Crea o aggiorna in Stripe: un prodotto con prezzo mensile e annuale per ogni piano (riconosciuti dalla lookup_key `geco_<piano>_<periodo>`, quindi il sito online non ha bisogno degli id), l'aliquota IVA 22%, il portale clienti (metodo di pagamento, fatture, disdetta a fine periodo, cambio piano) e il webhook verso `https://gecoitalia.it/api/stripe/webhook`. Alla prima creazione del webhook scrive chiave e segreto in `.env.vercel` (escluso da git). Si può rilanciare quando si vuole.
4. **Vercel.** Apri `.env.vercel`, copia tutto e incollalo in Vercel → progetto → **Settings → Environment Variables** (il campo *Key* accetta un .env intero), salva e fai **Redeploy**. Bastano queste due variabili: `STRIPE_TAX_RATE_ID` e `CRON_SECRET` sono facoltative.
5. **Tentativi e sospensione.** **Settings → Billing → Subscriptions and emails**: lascia i tentativi automatici (Smart Retries) e le email di pagamento fallito; dopo l'ultimo tentativo scegli *cancel the subscription*. Al primo pagamento fallito l'app sospende subito la scheda e la riattiva da sola quando un tentativo va a buon fine.

La prova gratuita di 7 giorni parte da sola al primo abbonamento di ogni azienda.

**In locale** il webhook si riceve con la [Stripe CLI](https://docs.stripe.com/stripe-cli):
```
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Il comando stampa un `whsec_...` da mettere in `STRIPE_WEBHOOK_SECRET` in `.env.local`, poi riavvia `npm run dev`.

**Cosa succede quando:**
- *Checkout pagato con carta*: il piano o il pacchetto si attivano in pochi secondi. *Con SEPA*: dopo la conferma della banca (qualche giorno lavorativo).
- *Rinnovo pagato*: il periodo si allunga; col primo incasso del Premium annuale in promo arriva il logo in Home in regalo.
- *Pagamento fallito*: scheda nascosta dai risultati e richieste disattivate finché il pagamento non riesce.
- *Disdetta dal portale*: il piano resta attivo fino a fine periodo pagato, poi la scheda esce dai risultati.

**Fatture elettroniche**: Stripe emette ricevute e fatture "di cortesia". La fattura elettronica verso lo SdI non è ancora collegata: serve un provider italiano via API prima di incassare davvero.

## Google Ads, pixel di Meta e banner dei cookie

Il sito misura quali pubblicità portano **richieste dei clienti**, **iscrizioni delle aziende** e **pagamenti**. Gli script di Google e Meta partono solo se il visitatore preme **Accetta** nel banner dei cookie: con **Rifiuta** non si carica niente. La scelta dura 6 mesi e si cambia da "Preferenze cookie" in fondo a ogni pagina. Finché le variabili qui sotto sono vuote il banner non compare e non si carica nulla. Codice in `src/components/site/consent.tsx` e `src/lib/domain/consent.ts`.

1. **Google Ads.** Strumenti → **Conversioni** → **Nuova azione di conversione** → **Sito web**, inserisci `gecoitalia.it` e scegli di configurare il tag **manualmente** (non con Google Tag Manager). Crea tre azioni: "Richiesta inviata" (categoria *Invia modulo per lead*), "Iscrizione azienda" (*Registrazione*) e "Pagamento azienda" (*Acquisto*). Per ognuna Google mostra `send_to: 'AW-123456789/AbCdEfGh'`: la parte prima della barra è l'ID dell'account, quella dopo è l'etichetta.
2. **Meta.** Gestione eventi → **Collega origini dati** → **Web** → crea un pixel e copia l'**ID del pixel** (solo numeri). Il codice del pixel non va incollato da nessuna parte: lo carica il sito.
3. **Vercel** → progetto → Settings → Environment Variables:

   | Nome | Valore |
   |---|---|
   | `NEXT_PUBLIC_GOOGLE_ADS_ID` | `AW-123456789` |
   | `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL` | etichetta di "Richiesta inviata" |
   | `NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL` | etichetta di "Iscrizione azienda" |
   | `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL` | etichetta di "Pagamento azienda" |
   | `NEXT_PUBLIC_META_PIXEL_ID` | ID del pixel |

   Sono variabili "pubbliche" (finiscono nella pagina, non sono segrete) e vengono lette **durante la build**: dopo averle inserite serve un nuovo deploy.
4. **Prova.** Apri il sito in una finestra in incognito, premi **Accetta**, invia una richiesta di prova. In Meta → Gestione eventi → **Eventi di test** compare "Lead"; in Google Ads la conversione passa da "Non verificata" a "Registrazione conversioni" entro qualche ora.

Prima del lancio pubblico l'informativa (`/privacy`, sezione Cookie) va fatta rivedere dal consulente insieme al resto.

## Errori con Sentry

Gli errori del sito (server e browser) arrivano su [Sentry](https://sentry.io) con pagina, browser e punto del codice, e Sentry manda un'email quando ne compare uno nuovo. Senza la variabile qui sotto non parte niente. Codice in `src/instrumentation.ts`, `src/instrumentation-client.ts` e `src/lib/domain/sentry.ts`.

Cosa **non** viene mandato: cookie, intestazioni di accesso, IP, email, contenuto dei moduli, token nei link, parametri delle query al database e variabili del codice (`SENTRY_DATA_COLLECTION` e `scrubEvent`). Niente registrazione dello schermo e nessun cookie nel browser, quindi non serve il consenso del banner.

1. **Account.** Su https://sentry.io crea l'account con info@gecoitalia.it e, alla domanda sulla regione dei dati, scegli **European Union (Frankfurt)**. Va scelta alla creazione dell'organizzazione e non si cambia dopo. Il piano gratuito (Developer, un utente, 5.000 errori al mese) basta per iniziare.
2. **Progetto.** Create Project → piattaforma **Next.js** → nome `gecoitalia`. Salta la procedura guidata (`npx @sentry/wizard`): il codice è già nel sito. Copia il **DSN**, del tipo `https://abc123@o456.ingest.de.sentry.io/789`. Deve contenere `ingest.de.sentry.io`: è l'unico indirizzo di Sentry ammesso dalla CSP.
3. **Vercel** → Environment Variables: `NEXT_PUBLIC_SENTRY_DSN` = il DSN (non è segreto). Facoltative, per vedere nel browser il codice vero e non quello compresso: `SENTRY_ORG` (slug dell'organizzazione), `SENTRY_PROJECT` (`gecoitalia`) e `SENTRY_AUTH_TOKEN` (Settings → Auth Tokens → Create New Token, **segreto**). Poi un nuovo deploy.
4. **Avvisi.** In Sentry → Alerts lascia l'avviso predefinito "nuovo problema" via email; aggiungi le email del team in Settings → Members, oppure inoltra da info@.

Gli allarmi via email già attivi (`alertTeam`: webhook Stripe, pagamenti falliti, codici non inviati) restano: Sentry li affianca e copre tutti gli altri errori.

## Backup notturno del database

Ogni notte alle 3 GitHub Actions ([.github/workflows/backup.yml](.github/workflows/backup.yml)) copia il database di
produzione, lo **ripristina per prova** in un PostgreSQL usa e getta, lo **cifra** (AES-256) e lo conserva tra gli
artifact di GitHub, fuori da Supabase e Vercel. Oltre 500 MB (`BACKUP_LIMIT_MB`) cancella i più vecchi e tiene i più
recenti; GitHub comunque non tiene un backup più di 90 giorni. Se una notte fallisce, GitHub manda un'email al
proprietario del repository.

Nello stesso workflow il job **foto** copia tutte le foto caricate dalle aziende (bucket `uploads` di Supabase
Storage): l'elenco lo legge dal database, i file dagli indirizzi pubblici. Le cifra con la stessa passphrase e
tiene solo le ultime 3 copie (artifact `geco-foto-…`), perché ogni copia contiene già tutte le foto.

**Attivarlo (una volta):** su GitHub, nel repository → Settings → Secrets and variables → Actions → New repository secret:

| Segreto | Valore |
|---|---|
| `BACKUP_DATABASE_URL` | Supabase (info@gecoitalia.it) → progetto `gecoitalia` → **Connect** → Session pooler (porta 5432), con la password del database |
| `BACKUP_PASSPHRASE` | Una frase lunga generata dal gestore di password. **Va conservata**: senza, i backup non si aprono |

Poi Actions → **Backup database** → **Run workflow** e controllare che diventi verde.

**Ripristinare:** dalla pagina dell'esecuzione in Actions scaricare l'artifact (zip), estrarlo e decifrarlo (chiede la passphrase):
```
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in geco-db-AAAA-MM-GG-HHMM.dump.enc -out geco.dump
```
Poi caricarlo in un database **nuovo e vuoto** (per esempio un nuovo progetto Supabase), con client PostgreSQL 17:
```
psql "URL_DEL_DATABASE_NUOVO" -c "create role geco_partner nologin" -c "drop schema public cascade"
pg_restore -d "URL_DEL_DATABASE_NUOVO" --no-owner --no-privileges geco.dump
```
Il `drop schema public` cancella tutto: **mai** sul database in uso. Infine aggiornare la stringa del database su Vercel e
rifare il deploy.

**Ripristinare le foto:** scaricare l'ultimo artifact `geco-foto-…`, estrarlo e decifrarlo:
```
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in geco-foto-AAAA-MM-GG-HHMM.tar.enc | tar -xf -
```
Esce una cartella `foto` con le sottocartelle (`avatars`, `partners`, `portfolio`). Caricarle nel bucket `uploads`
dal pannello Supabase → Storage, trascinandole e tenendo gli stessi nomi: gli indirizzi salvati nel database
tornano a funzionare. Se il progetto Supabase è nuovo, cambia l'indirizzo nelle foto: va aggiornato anche nel database.

## Al lancio pubblico

1. Togli `SITE_ACCESS` e `DEMO_MODE` da Vercel. Senza `SITE_ACCESS` le scorciatoie demo si spengono comunque da sole.
2. Svuota i dati di esempio dal database. Dal 16/11/2026 il deploy non lancia più `npm run db:seed` (`vercel.json`), così le aziende di esempio non tornano dopo la pulizia. Su un database nuovo e vuoto il seed va lanciato una volta a mano, con `DATABASE_URL` di quel database: categorie, servizi e piani di partenza arrivano da lì.
3. Prima del lancio servono anche RLS, rate limit e Turnstile, email con Brevo, fatturazione elettronica SdI (vedi CLAUDE.md, "Da fare"). Per Stripe passa alle chiavi **live** e crea il webhook anche in modalità live.

## Sicurezza: protezione da flood e DDoS

L'applicazione ha limiti anti-abuso nel codice (OTP per contatto, tentativi di accesso per email e
per IP, invio richieste per IP: vedi `src/lib/security/ip-limit.ts`). Questi fermano lo spam e il
credential stuffing, **ma non un vero attacco DDoS**: un flood di richieste va assorbito al bordo,
prima che arrivi all'applicazione.

Attiva dal 16/11/2026: regola **"Rate limit auth paths"** (Vercel → `geco` → Firewall → Rules) su `/accedi`, `/auth`,
`/richiesta`, `/assistenza`, `/registrazione-partner`: oltre 60 richieste al minuto per IP risponde 429. Il piano Hobby
ne consente 3. I webhook (`/api/...`) restano fuori.

Altre opzioni, sempre dalla dashboard Vercel e non dal codice:

- **Vercel Firewall → Attack Challenge Mode**: da attivare in caso di attacco in corso; presenta una
  sfida ai client sospetti.
- **Vercel Firewall → Rate Limiting**: regola per IP sulle rotte sensibili (`/accedi`, `/auth/*`,
  l'invio richiesta), ad esempio 100 richieste/minuto per IP.
- In alternativa o in aggiunta, mettere **Cloudflare** davanti al dominio (proxy arancione) con
  protezione DDoS e rate limiting.

La CSP e gli altri header di sicurezza sono in `next.config.ts`. La `Content-Security-Policy` usa
`'unsafe-inline'` per gli script: come irrobustimento successivo si può passare a una CSP con nonce.

### Storage dei file in produzione

Su Vercel il filesystem è di sola lettura, quindi gli upload non possono andare su `public/uploads`.
Impostare `STORAGE_PROVIDER=supabase` e le variabili `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_STORAGE_BUCKET` (bucket pubblico). Senza `STORAGE_PROVIDER` in produzione l'app si ferma
all'avvio dell'upload, per non fallire in modo silenzioso.
