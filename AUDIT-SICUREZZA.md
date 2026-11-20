# Audit di sicurezza e test di carico — geco

**Data:** 26 ottobre 2026
**Oggetto:** piattaforma `geco-piattaforma` (Next.js 16 + Drizzle + PostgreSQL/Supabase)
**Ambito:** revisione del codice di sicurezza, interventi di irrobustimento, test di carico in produzione.

---

## 1. In sintesi

La base del progetto è **solida**. L'audit non ha trovato vulnerabilità gravi: niente SQL injection,
niente accessi incrociati tra partner (IDOR), autenticazione fatta bene, segreti non esposti. Sono
stati chiusi alcuni punti di irrobustimento (CSP, verifica firma OAuth, rate limit per IP, upload per
la produzione) e verificato sotto carico che il sito regge senza errori.

Il punto che risponde alla preoccupazione "possono buttarmi giù il sito?": **un test di carico non
rende immuni a un attacco di tipo flood/DDoS**. Quella protezione va messa al bordo (Vercel Firewall o
Cloudflare), non nel codice. Vedi §6.4.

---

## 2. Cosa è stato controllato e come

- **Dipendenze:** `npm audit` (produzione e sviluppo).
- **Segreti e configurazione:** file `.env*`, `.gitignore`, storia di git, header di sicurezza, `next.config.ts`.
- **Autenticazione/sessioni:** `src/lib/auth/*`, `src/app/accedi/actions.ts`, route OAuth.
- **Autorizzazione (IDOR):** tutte le server action dell'area partner e le query con `partnerId`.
- **Input pubblici:** form richiesta lead, ricerca, upload immagini.
- **Carico:** build di produzione + `next start` + `autocannon` su un'istanza locale con PostgreSQL embedded.

---

## 3. Esito dell'audit (lo stato di partenza)

### Punti forti (già a posto)
- **Dipendenze:** 0 vulnerabilità in produzione. Le 4 "moderate" sono in `drizzle-kit` (solo sviluppo, non va online).
- **Segreti:** nessun `.env` reale tracciato da git né presente nella storia; solo `.env.example` con valori finti.
- **SQL injection:** coperta — query parametrizzate di Drizzle ovunque, nessuna concatenazione di stringhe.
- **IDOR:** coperto — ogni azione dell'area partner ricava l'identità dalla sessione (`requirePartner`) e
  filtra sempre per `partnerId`; l'id non arriva mai dal client. Le `update`/`delete` hanno sempre
  `and(eq(id), eq(partnerId))`.
- **Login:** hash sicuro, limite anti brute-force (10 tentativi/15 min per email), protezione timing
  (`burnPasswordCheck`), nessuna user-enumeration, audit log.
- **OTP:** pepper obbligatorio (>=32 char in produzione), rate limit per destinatario (3/10min, 8/giorno).
- **Form lead pubblico:** honeypot anti-bot, validazione `zod`, controllo che tipo/servizio/domande
  siano quelli davvero offerti dal partner, conferma via OTP SMS prima della consegna.
- **Upload immagini:** riconoscimento del formato dai primi byte del file (non si fida del MIME dichiarato),
  limite 2 MB, nome casuale.

### Punti deboli trovati (poi corretti, vedi §4)
1. **Nessuna Content-Security-Policy.** Mancava la difesa principale contro XSS (altri header c'erano).
2. **Firma dell'id_token OAuth non verificata.** Si leggevano solo le claim senza verificare la firma crittografica.
3. **Upload su disco locale (`public/uploads`).** Su Vercel il disco è di sola lettura: in produzione gli upload si sarebbero rotti.
4. **Nessun rate limit per IP.** I limiti erano per email/telefono: un singolo IP poteva provare molte email/telefoni diversi.
5. **Nessuna protezione anti-flood/DDoS.** Nessun freno globale; va gestito al bordo (resta da fare lato infrastruttura, §6.4).

---

## 4. Interventi applicati

| # | Intervento | File |
|---|---|---|
| 1 | **Content-Security-Policy** + HSTS + Cross-Origin-Opener-Policy | `next.config.ts` |
| 2 | **Verifica firma JWT OAuth** con `jose` (JWKS di Google/Apple: firma, emittente, destinatario, scadenza, nonce) | `src/lib/auth/oauth.ts` |
| 3 | **Astrazione storage**: disco in sviluppo, Supabase Storage in produzione | `src/lib/storage/index.ts` (nuovo), `src/app/area-partner/actions.ts` |
| 4 | **Rate limit per IP** su login, registrazione e invio richiesta (basato su `audit_logs`, vale su tutte le istanze serverless) | `src/lib/security/ip-limit.ts` (nuovo), `src/app/accedi/actions.ts`, `src/app/(pubblico)/richiesta/actions.ts` |
| 5 | **Guida anti-DDoS e storage** | `DEPLOY.md`, `.env.example` |
| 6 | **Font self-hosted** (DM Sans, Fraunces): la build non dipende più da Google Fonts (resilienza + build offline/CI) | `src/app/layout.tsx`, `src/app/fonts/*.woff2` |

Verifiche: `tsc` ok, `eslint src` pulito, 108 test passati.

---

## 5. Test di carico (produzione)

Build di produzione + `next start`, una istanza sul Mac con PostgreSQL embedded. 10 secondi per scenario.

| Scenario | Connessioni | req/s | Latenza media | Errori |
|---|---|---|---|---|
| Home | 50 | ~25 | 2.37s | 0 |
| Cerca professionista (DB) | 50 | ~22 | 2.56s | 0 |
| Cerca casa (DB) | 50 | ~29 | 1.91s | 0 |
| Home (tetto) | 100 | ~30 | 3.93s | 0 |

- A riposo ogni pagina risponde in **0.1–0.2s**.
- Sotto carico: **zero errori** a 50 e 100 connessioni. Il sito non cade, accoda e rallenta.
- Il collo di bottiglia **non è il database** ma il **peso delle pagine** (la home trasferisce ~216 KB a
  richiesta). Le pagine con DB reggono quanto la home.

> Nota: ~25–30 req/s è il tetto di *una* istanza locale. Su Vercel il serverless scala in orizzontale,
> quindi la capacità reale del sito live è molto più alta. Questo numero misura quanto lavora il codice
> per richiesta, non il limite del sito.

---

## 6. Dove migliorare (in ordine di priorità)

### 6.1 Peso delle pagine (impatto più alto sulla capacità)
- Ottimizzare le immagini con `next/image` (dimensioni corrette, formati moderni, lazy load).
- Ridurre il First Load JS (componenti client solo dove servono).
- Obiettivo: far scendere la home sotto ~100 KB/richiesta; raddoppierebbe il throughput.

### 6.2 Caching delle pagine pubbliche
- Home e liste sono già a prerender parziale (`◐`, revalidate 1h): bene.
- Assicurarsi che il traffico pubblico colpisca la cache e non il rendering. Verificare che le pagine
  `trova-professionista` / `trova-casa` e i profili pubblici siano cache-abili il più possibile.

### 6.3 Connessioni a Supabase
- In produzione usare il **pooler in modalità transaction** (già annotato in `.env.example`): evita che
  molte istanze serverless esauriscano le connessioni Postgres sotto picco.
- Impostare `STORAGE_PROVIDER=supabase` + `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_STORAGE_BUCKET` (bucket pubblico) per gli upload.

### 6.4 Protezione anti-flood/DDoS (da fare lato infrastruttura)
Questa è **la** risposta alla domanda "possono buttarmi giù il sito?". Va configurata dalla dashboard,
non dal codice:
- **Vercel Firewall → Attack Challenge Mode** (da attivare in caso di attacco in corso).
- **Vercel Firewall → Rate Limiting**: regola per IP su `/accedi`, `/auth/*`, invio richiesta (es. 100 req/min/IP).
- In alternativa/aggiunta: **Cloudflare** davanti al dominio (proxy, DDoS protection, rate limiting).

### 6.5 Irrobustimenti minori
- **CSP con nonce**: la CSP attuale usa `'unsafe-inline'` per gli script (scelta pragmatica per non
  rompere la UI). Passare a una CSP con nonce quando c'è tempo.
- **Pulizia `audit_logs`**: il rate limit per IP scrive una riga per tentativo; prevedere una pulizia
  periodica delle righe vecchie (`entity = 'ip'`).

---

## 7. Dipendenze aggiunte
- `jose` — runtime, necessaria alla verifica della firma OAuth.
- `@fontsource-variable/dm-sans`, `@fontsource/fraunces` — font self-hosted.
- `autocannon` — solo sviluppo, per il test di carico.

---

## 8. File modificati o aggiunti in questa sessione
```
next.config.ts                              (CSP + header di sicurezza)
src/lib/auth/oauth.ts                        (verifica firma JWT)
src/lib/storage/index.ts                     (nuovo — astrazione storage)
src/lib/security/ip-limit.ts                 (nuovo — rate limit per IP)
src/app/area-partner/actions.ts              (upload via storage)
src/app/accedi/actions.ts                    (rate limit per IP)
src/app/(pubblico)/richiesta/actions.ts      (rate limit per IP)
src/app/layout.tsx                           (font self-hosted)
src/app/fonts/dm-sans-latin-wght-normal.woff2    (nuovo)
src/app/fonts/fraunces-latin-600-normal.woff2    (nuovo)
.env.example                                 (variabili storage)
DEPLOY.md                                    (sezione sicurezza + storage)
package.json                                 (dipendenze sopra)
```

---

## 9. Come rieseguire il test di carico

In locale, su una build di produzione:
```bash
npm run build && npm run start      # avvia il sito in produzione sulla porta 3000
npx autocannon -c 50 -d 30 http://localhost:3000/
```

Oppure contro una **preview di Vercel** (mai sulla produzione con dati reali):
```bash
npx autocannon -c 50 -d 30 https://<tua-preview>.vercel.app/
```

---

## 10. Aggiornamento del 20 novembre 2026: controllo sui 10 punti di un report esterno

Un report generato da uno strumento esterno elencava 10 punti. Esito punto per punto, con quello che è stato
cambiato. Verifiche: 336 test unitari passati (26 saltati perché vogliono il database), `tsc` e `eslint` puliti,
`next build` riuscita, header e ottimizzatore di immagini provati su `next start`.

| # | Punto del report | Stato prima | Cosa è stato fatto |
|---|---|---|---|
| 1 | Chiave `GOOGLE_GENAI_API_KEY` | Il progetto non la usa: compare solo dentro il codice della libreria Sentry (`node_modules/@sentry`), che sa misurare le chiamate a Gemini se un'app le fa | Niente da fare |
| 2 | DSN di Sentry con `NEXT_PUBLIC_` | Corretto così: il DSN serve al browser per mandare gli errori e permette solo di inviarne. Toglierlo spegnerebbe gli errori del browser | Pulizia estesa ai **breadcrumb** (link con token, chiamate di rete, console) e al corpo delle richieste; `tracesSampleRate: 0` c'era già. In `DEPLOY.md` gli "Allowed Domains" del DSN |
| 3 | Database | Query tutte parametrizzate (Drizzle; `sql.unsafe` solo negli script locali con testo fisso), Data API di Supabase chiusa (migrazione 0004), RLS per Area Partner e Area cliente, TLS `require` (cifrato ma senza verifica del certificato) | **`verify-full` facoltativo** con `DATABASE_CA_CERT` (`databaseSsl` in `src/lib/db/url.ts`, 5 test). Va attivato su Vercel (`DEPLOY.md`) |
| 4 | Header di sicurezza | Già tutti presenti (CSP, HSTS, `nosniff`, `X-Frame-Options: DENY` che è più stretto di `SAMEORIGIN`, `Referrer-Policy`) | Niente da fare; `next-secure-headers` e `helmet` non servono con `headers()` di Next |
| 5 | Rate limit sull'accesso | Già attivo: 10 password sbagliate in 15 minuti per email, 50 tentativi per IP, limiti per IP su registrazione, recupero password, richieste e assistenza, Turnstile, regola nel Firewall di Vercel. Non esiste `/api/auth/*` | Niente da aggiungere |
| 6 | Segreti e cifratura | Nessun segreto nel repository né nella storia di git (controllato con un'espressione per chiavi Stripe, Brevo, Resend, Supabase, Google), segreti su Vercel cifrati. Supabase cifra i dischi (AES-256), le carte non passano mai dal database (Stripe), password e token salvati come hash, backup cifrati | Niente da fare; Google Secret Manager non serve con Vercel. Da attivare su GitHub la **push protection** (`DEPLOY.md`) |
| 7 | Dipendenze | Produzione: 0 vulnerabilità. Sviluppo: 7 moderate (`autocannon`, `esbuild` vecchio dentro `drizzle-kit`, che non lo usa) | `autocannon` 9, `overrides` per l'esbuild di `@esbuild-kit/core-utils` → **0 vulnerabilità**. `npm audit --audit-level=high` nella CI, **Dependabot** settimanale |
| 8 | Log e allarmi | Errori stampati così come sono: un errore di Drizzle porta nei log di Vercel i parametri della query (nomi, email, testo delle richieste) | **`logError`** (`src/lib/domain/log.ts`, 2 test) toglie email, token e parametri; **allarme al team** quando un account si blocca per 10 password sbagliate; avviso Sentry sui picchi di errori in `DEPLOY.md`. `pino`/`winston` e un SIEM sono di troppo per un solo sviluppatore: bastano Vercel Logs e Sentry |
| 9 | CSP delle immagini | `img-src` ammetteva qualunque sito `https:` | `img-src` solo dal sito e dai pixel di Google Ads e Meta, `media-src 'self'`; le foto di Supabase passano da `next/image` con `remotePatterns` limitato al bucket pubblico (prima mancava: le foto caricate in produzione non si sarebbero viste, risposta 400). Elenco host di Google Ads completato (mancavano `google.it`, `pagead2`, `ad.doubleclick.net`). Nonce non adottato: renderebbe dinamiche tutte le pagine (vedi `DEPLOY.md`) |
| 10 | Test di sicurezza | Test unitari della validazione degli input già presenti (richieste, profilo, registrazione azienda, password, OTP, assistenza) più i test end-to-end | **CodeQL** (`.github/workflows/codeql.yml`, regole `security-extended`). OWASP ZAP non aggiunto: andrebbe lanciato contro un sito di prova, non contro quello vero |

---

## 11. Revisione di permessi e logica (20 novembre 2026)

Riletti a mano tutte le azioni del server (Area Partner, gestionale, area cliente, richieste, registrazione,
assistenza, accesso), le API (webhook Stripe e email, ritorno dal Checkout, cron, statistiche, export dei dati),
sessioni, OAuth, link monouso, OTP e le pagine con un id nell'indirizzo. Non è un test dall'esterno.

**Già a posto:** ogni pagina e azione dell'Area Partner passa da `requirePartner()` con l'azienda presa dalla sessione
(il cookie dell'azienda scelta vale solo tra quelle dell'account) e dalla RLS; ogni pagina e azione del gestionale da
`requireAdmin()`; i lead bloccati del piano gratuito nascondono i dati già nella query; il ritorno dal Checkout
controlla che la sessione Stripe sia dell'azienda; i pacchetti si attivano solo con `payment_status = paid` e una volta
sola; webhook firmati (Stripe, Svix con finestra anti-replay); link monouso consumati in modo atomico; nuova password =
tutte le sessioni chiuse; pagine `/richiesta/inviata/[id]` e `/richiesta/com-e-andata/[id]` senza dati personali;
nessun link costruito con dati scritti dagli utenti; JSON-LD con `<` escapato.

| # | Falla | Gravità | Stato |
|---|---|---|---|
| 1 | **Redirect verso un altro sito dopo l'accesso**: `/accedi?next=/%09/sito-falso.it` superava `safeNextPath` (tab e a capo vengono tolti dal browser, e `/<tab>/sito` diventa `//sito`). Utile per il phishing: dopo il login vero si finiva su una copia del sito | Media | **Corretta**: caratteri di controllo rifiutati e controllo finale con il parser `URL` (`src/lib/domain/format.ts`, 2 test) |
| 2 | **Account preparato con l'email di un altro**: chi si registra con l'email di qualcun altro (senza confermarla) teneva password e sessione anche dopo che il vero proprietario entrava con Google, che conferma l'email. Da lì vedeva le sue richieste; con un'email di `ADMIN_EMAILS` non ancora registrata diventava amministratore | Media | **Corretta**: collegando Google/Apple a un account mai confermato si tolgono password e sessioni (`userForOAuthProfile`, 2 test sul database). Un'azienda vera mai confermata che entra con Google dal lato clienti rimette la password con "Password dimenticata" |
| 3 | **Chiunque può registrare un'azienda con la partita IVA di un'altra** (basta che sia valida) e, col piano gratuito, la scheda va online subito, senza controllo del team: riceve i contatti dei clienti a nome di quell'azienda e blocca la registrazione di quella vera | Media | **Da decidere**: per esempio scheda visibile solo dopo il badge "Verificato" del team, o controllo della partita IVA (VIES) e dell'email |
| 4 | **Ticket dell'assistenza a nome di altri**: dal modulo pubblico, senza accesso, con l'email di un'azienda il ticket finisce nella sua Area Partner e nell'area cliente (testo e nome scelti da chi scrive). Il gestionale lo segna "non verificato" | Bassa | **Da decidere**: mostrare nelle aree private solo i ticket aperti da dentro l'account, o dopo una risposta del team |
| 5 | **Cron `/api/cron/esito-richieste` senza `CRON_SECRET`** chiamabile da chiunque (manda solo prima le email "Com'è andata?", una volta sola per richiesta) | Bassa | Impostare `CRON_SECRET` su Vercel |
| 6 | Restano by design: chi clicca il link di conferma arrivato per una registrazione fatta da altri conferma quell'account (l'email dice di ignorarla); 10 password sbagliate bloccano l'accesso di quell'email per 15 minuti anche se le prova un estraneo | Bassa | Note |
