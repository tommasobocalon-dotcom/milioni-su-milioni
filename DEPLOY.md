# Sito di prova su gecoitalia.it

Il sito va online su **https://gecoitalia.it**, ma visibile **solo al team**. Il browser chiede nome e password prima di mostrare qualsiasi pagina. Chi non ha le credenziali vede solo "Sito di prova riservato al team" e i motori di ricerca non indicizzano nulla.

Servizi usati (come da CLAUDE.md):

| Cosa | Dove | Costo |
|---|---|---|
| Sito (Next.js) | Vercel, regione Francoforte | Hobby gratis, ma **solo per uso non commerciale**. Per un progetto per un cliente Vercel chiede il piano Pro (20 $/mese) |
| Database | Supabase, regione Francoforte (UE) | Free: 0 €. Il progetto va in pausa dopo 7 giorni senza visite e si riattiva dal pannello |
| Dominio | Aruba (già acquistato) | — |

Come funziona la protezione: [src/proxy.ts](src/proxy.ts) legge la variabile `SITE_ACCESS`. Se è impostata, ogni richiesta richiede nome e password (HTTP Basic Auth); se è vuota, il sito è aperto. Con `DEMO_MODE=1` (e solo se il sito è protetto) i codici SMS compaiono a schermo e la pagina di accesso mostra l'account di prova, come in locale.

---

## Passo 1 — Database su Supabase

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
   | `SMS_PROVIDER` | `console` |
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

## Passo 5 — Dare l'accesso al team

Manda a ogni persona:
- il link https://gecoitalia.it;
- il **suo** nome e la **sua** password (finestra del browser "Accedi");
- per provare l'Area Partner: l'account di prova mostrato nella pagina **Accedi**;
- per provare una richiesta di contatto: il codice SMS compare a schermo, non serve un telefono vero.

**Aggiungere o togliere una persona:** su Vercel modifica `SITE_ACCESS` (Settings → Environment Variables), poi **Deployments → ⋯ → Redeploy** sull'ultimo deploy. Le variabili cambiate valgono solo dopo un nuovo deploy.

## Cosa non funziona ancora sul sito di prova

- **Caricamento foto** (logo, portfolio, foto profilo): in locale le foto vanno su disco, ma su Vercel il disco è di sola lettura. Serve Supabase Storage.
- **SMS ed email** non partono: i codici compaiono a schermo (`DEMO_MODE`).
- **Accesso con Google/Apple**: funziona solo dopo aver inserito le variabili `GOOGLE_*` / `APPLE_*` su Vercel, con URI di ritorno `https://gecoitalia.it/auth/google/callback` e `https://gecoitalia.it/auth/apple/callback`.
- **Pagamenti Stripe**: non ancora collegati (acquisto token simulato).
- I dati sono **di esempio** (partner e recensioni inventati): vanno bene finché il sito è riservato al team, **non al lancio** (PRD §5.6).

## Al lancio pubblico

1. Togli `SITE_ACCESS` e `DEMO_MODE` da Vercel. Senza `SITE_ACCESS` le scorciatoie demo si spengono comunque da sole.
2. In `vercel.json` togli `npm run db:seed` dal *buildCommand* e svuota i dati di esempio dal database.
3. Prima del lancio servono anche RLS, rate limit e Turnstile, provider SMS ed email reali, Stripe (vedi CLAUDE.md, "Da fare").
