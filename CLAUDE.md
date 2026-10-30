# CLAUDE.md — Piattaforma Casa & Professionisti

Guida per Claude Code su questo progetto. Fonte di verità del prodotto: `prd.md` (leggilo prima di qualsiasi lavoro su funzionalità). PDF di contesto: `masterplan.pdf`, `previsione e monetizzazione.pdf`, `top piano.pdf` (pesante, ~16 MB: leggere solo le pagine necessarie).

## Progetto in breve

Aggregatore web (Veneto → Triveneto → Nord Italia) che mette in contatto clienti con agenzie immobiliari, tecnici, artigiani e partner B2B.
- **B2C**: *Trova Casa*, *Trova Professionista / Artigiano*, profili pubblici, richiesta di contatto guidata con OTP, recensioni verificate.
- **B2B**: abbonamenti Stripe (Base / Media / Professional, mensile o annuale) + **token prepagati** (lead oltre quota, boost, in evidenza). Sospensione automatica al pagamento fallito.
- **Area Commerciale** (vendita porta a porta, mobile), **Backoffice Admin**, **assistente AI** (mascotte geco) lato cliente e partner.
- Stato (ottobre 2026): **MVP navigabile in sviluppo**, vedi "Stato dello sviluppo" sotto e [README.md](README.md) per avviarlo.

## Stack (PRD §12, con le scelte fatte)

| Livello | Scelta |
|---|---|
| App | **Next.js 16** (App Router, Cache Components + Partial Prefetching attivi) + TypeScript, unico progetto. Leggere `node_modules/next/dist/docs/` prima di usare API di Next: è cambiato molto (vedi `AGENTS.md`) |
| UI | Tailwind CSS 4 con i token del Figma in `src/app/globals.css`; componenti propri in stile shadcn (cva + tailwind-merge) in `src/components/ui` |
| DB | PostgreSQL (Supabase UE in produzione). In locale **embedded-postgres** avviato da `npm run dev` (porta 54329, dati in `.data/postgres`). Distanze calcolate in TypeScript; PostGIS e pgvector quando servono |
| ORM | **Drizzle** (deciso): schema in `src/lib/db/schema.ts`, migrazioni SQL in `drizzle/` |
| Auth | **Email + password (hash scrypt) e accesso con Google / Apple (OpenID Connect, codice in `src/lib/auth/oauth.ts`, senza librerie) + sessioni nel database** (cookie httpOnly, token salvato come hash). L'OTP via SMS resta solo per verificare i lead. Collegamento a un account esistente solo con email verificata dal provider; blocco dopo 10 password sbagliate in 15 minuti (registro in `audit_logs`). Supabase Auth non usato per ora. Recupero password e conferma email con link monouso (tabella `auth_tokens`, solo hash; email via `src/lib/notify`, Resend in produzione). Autorizzazione nell'app: ogni pagina/azione dell'Area Partner passa da `requirePartner()`; **RLS da aggiungere** prima del lancio |
| Storage | Supabase Storage |
| Pagamenti | Stripe Billing, Checkout, Customer Portal, webhook idempotenti e firmati |
| Fatture | Provider SdI italiano via API |
| Email / SMS | Resend o Postmark / Twilio |
| Mappe | MapLibre + tile OSM |
| AI | Claude via API con tool calling + RAG su pgvector |
| Job | pg_cron, Inngest se serve |
| Hosting | Vercel (Francoforte) |
| Antispam | Cloudflare Turnstile |
| Monitoraggio | Sentry, PostHog EU |
| Qualità | GitHub Actions, Vitest, Playwright |

## Regole di lavoro

- **Lingua**: interfaccia, testi e documentazione in italiano. Codice (nomi di variabili, funzioni, tabelle) in inglese, salvo i nomi già fissati nel PRD §14 se si decide di mantenerli.
- **Un solo sviluppatore**: preferire servizi gestiti e soluzioni semplici; niente infrastruttura superflua.
- **Dati in UE**, GDPR, AI Act (l'assistente dichiara di essere un'IA), contenuti sponsorizzati sempre etichettati.
- **Sicurezza**: RLS su ogni tabella dei partner, segreti solo in variabili d'ambiente, rate limiting, pratiche OWASP.
- **Denaro e token**: ledger immutabile, webhook Stripe idempotenti, nessuna logica di saldo fuori dal ledger.
- **Accessibilità**: WCAG 2.1 AA. Palette: non usare `--salvia-500` come sfondo per testo bianco.
- **Mobile-first**, PWA per partner e commerciali.
- **Test**: TDD dove possibile (Vitest unit, Playwright E2E). Non modificare i test per farli passare (plugin `protect-tests` attivo).
- **E2E isolati**: `npx playwright test` avvia un proprio server sulla porta 3100 (cartella `.next-e2e`) con il database `geco_e2e` e azzera solo quello (`db-reset` rifiuta gli altri). Il database `postgres` di `npm run dev` non viene mai toccato.
- Ambiente: **Windows 11**, shell PowerShell 5.1 (niente `&&`) oppure Git Bash.
- Repo git nella cartella del progetto (branch `main`), Git per Windows installato. In PowerShell 5.1 non riscrivere file con `Get-Content`/`Set-Content` (rompe gli accenti UTF-8): usare gli strumenti di modifica file.
- Con Cache Components: letture di cookie, `searchParams`, `params` e dati non in cache vanno dentro `<Suspense>`; prima di `new Date()` in un componente chiamare `await connection()`. Verificare sempre con `npm run build` e controllando la console (insight di Next).

## Stato dello sviluppo

**Fatto e testato** (177 test unitari, 20 end-to-end, build di produzione ok):
- Home, *Trova Casa*, *Trova Professionista* con filtri, ordinamento (punteggio PRD §7.5) e posti sponsorizzati etichettati; ricerca libera `/cerca` ("rifare il bagno a Mestre").
- Profili pubblici agenzia e professionista con listino indicativo, portfolio, recensioni verificate, dati strutturati `LocalBusiness`/`AggregateRating`, URL del PRD §5.4.
- Richiesta di contatto in 5 passi con domande dinamiche per categoria, verifica OTP via SMS, conteggio quota/token/duplicati/lead bloccato oltre quota (PRD §7.4), pagina di conferma con alternative.
- Area Partner: accesso con email e password o Google/Apple, panoramica, inbox e dettaglio lead (stato, note, segnalazione entro 72 h, sblocco con token), token (registro immutabile, acquisto simulato solo in sviluppo), listino, abbonamento.
- Stripe (codice in `src/lib/billing/stripe.ts`, webhook `/api/stripe/webhook`): Checkout abbonamento mensile/annuale e pacchetti token (carta + SEPA, IVA 22%), Customer Portal, webhook firmato e idempotente (tabella `stripe_processed`), sospensione immediata al pagamento fallito e riattivazione automatica, azzeramento quota e token omaggio a ogni periodo pagato. Prezzi creati in Stripe da `npm run stripe:setup`. Configurazione in `DEPLOY.md`.
- Registrazione partner self-service `/registrazione-partner` (PRD §6.1): account con ritorno automatico (`/accedi?next=`), dati azienda con controllo P.IVA, SDI o PEC, scheda creata "in attivazione" e nascosta finché il piano non è pagato; senza Stripe, in sviluppo e sul sito di prova, attivazione del piano senza pagamento.
- Pagine *Come funziona* (ordinamento e recensioni spiegati), *Per i professionisti* (piani), privacy e termini in bozza, 404.
- Gestionale `/admin` (PRD §10, prima parte): accesso con ruolo `admin` o email in `ADMIN_EMAILS` confermata (`requireAdmin()`, 404 per gli altri), panoramica (MRR, partner, lead, token, cose da fare), assistenza a ticket (modulo pubblico `/assistenza`, Area Partner → Assistenza, email in arrivo via webhook `/api/assistenza/email` con Resend firmato o token; risposte per email con `[geco #N]` nell'oggetto, note interne, stato, presa in carico), partner (ricerca, verifica/badge, sospensione e riattivazione, accredito token nel registro), segnalazioni lead (accolta = token rimborsati o quota liberata), moderazione recensioni, registro attività. Codice in `src/app/admin`, `src/lib/support`, `src/lib/data/admin.ts`.

**Da fare** (prossimi passi suggeriti): fatturazione elettronica SdI collegata al webhook Stripe, Area Partner ridotta al solo pagamento quando l'account è sospeso, resto del Backoffice (tassonomia, zone, piani e coupon, contenuti/FAQ, pesi del ranking, commerciali, impersonificazione in sola lettura), invito dei commerciali con piano precompilato, editor della scheda/listino/portfolio con upload foto, chiave Google Places (recensioni Google gia pronte nel codice), mappa MapLibre, provider reali SMS/email (e ricezione email dell'assistenza, ATTIVAZIONE-SERVIZI.md §4), RLS, Area Commerciale, assistente AI, deploy (Vercel + Supabase UE).

**Valori provvisori presi dal Figma** (da confermare, PRD §20): nome "geco", prezzi piani (annuale = 10 mensilità), 8 token per lead oltre quota con sblocco entro 48 h, pacchetti token 50/120/300 a 49/99/219 €, tono "tu" anche verso i partner.

## Skill da usare (via tool `Skill`)

**Processo (superpowers) — sempre per primi**
- `superpowers:brainstorming` — prima di ogni nuova funzionalità o decisione di design.
- `superpowers:writing-plans` → `superpowers:executing-plans` / `superpowers:subagent-driven-development` — per lavori in più passi.
- `superpowers:test-driven-development` — scrittura codice.
- `superpowers:systematic-debugging` — qualsiasi bug.
- `superpowers:verification-before-completion` — prima di dichiarare finito.
- `superpowers:requesting-code-review` / `superpowers:finishing-a-development-branch` / `superpowers:using-git-worktrees`.

**Setup e architettura**
- `javascript-typescript:typescript-scaffold` — scaffold Next.js iniziale.
- `frontend-mobile-development:nextjs-app-router-patterns` — SSR/SEO, Server Components, Server Actions.
- `backend-development:api-design-principles`, `backend-development:architecture-patterns`.
- `javascript-typescript:typescript-advanced-types`, `javascript-typescript:modern-javascript-patterns`.

**Database**
- `database-design:postgresql-table-design` — schema (PRD §14), PostGIS, pgvector, RLS.
- `database-migrations:sql-migrations` — migrazioni versionate.

**UI e brand**
- `frontend-design:frontend-design` — direzione visiva (verde bosco / salvia, geco).
- `frontend-mobile-development:tailwind-design-system`, `ui-design:design-system-setup`, `ui-design:design-system-patterns`, `ui-design:visual-design-foundations`.
- `ui-design:create-component`, `frontend-mobile-development:component-scaffold`, `ui-design:web-component-design`.
- `ui-design:responsive-design`, `ui-design:interaction-design`.
- `ui-design:accessibility-compliance`, `accessibility-compliance:accessibility-audit`, `accessibility-compliance:wcag-audit-patterns`.
- `frontend-mobile-development:react-state-management`.
- `design-taste-frontend` (taste-skill, installata nel progetto) — per costruire o rivedere pagine e schermate, **sempre con le eccezioni della sezione "taste-skill in questo progetto"** qui sotto.
- Figma (`figma:*`) se arrivano design da Figma.

**Pagamenti**
- `payment-processing:stripe-integration` — Billing, Checkout, Portal, webhook.
- `payment-processing:billing-automation` — rinnovi, sospensione, dunning.
- `payment-processing:pci-compliance`.

**Assistente AI**
- `claude-api` — **obbligatoria** prima di scrivere codice che usa l'API di Claude (modelli, tool use, caching, costi).

**Test e qualità**
- `unit-testing:test-generate`, `javascript-typescript:javascript-testing-patterns`, `tdd-workflows:tdd-cycle`.
- `pw:pw-init`, `pw:generate`, `pw:fix`, `pw:coverage` — Playwright E2E.
- `code-review`, `simplify`, `comprehensive-review:full-review`, `security-review`.
- `frontend-mobile-security:xss-scan`, `openai-security-best-practices:openai-security-best-practices`.

**Git e flusso**
- `git-pr-workflows:git-workflow`, `git-pr-workflows:pr-enhance`.

**Documenti e grafici**
- `anthropic-skills:pdf` — leggere i PDF del progetto.
- `dataviz` — dashboard admin, statistiche partner, report commerciali.
- `artifact-design` / `artifact-diagramming` — pagine o diagrammi da condividere.

**Avvio app**: `run` per lanciare e verificare l'app nel browser.

## taste-skill in questo progetto

La skill `design-taste-frontend` ha regole di stile proprie che in parte vanno contro il design system già approvato dal cliente (file Figma *Piattaforma Casa & Professionisti — Bozza UI*, pagine *Fondamenta* e *Componenti*) e contro alcuni obblighi del PRD. **Vince il brand**: dalla skill si prendono composizione, gerarchia, contenuti, immagini e i controlli in browser, non palette, font o componenti.

**Quale percorso della skill usare**
- *Pagina* (percorso standard): Home, *Come funziona*, guide, pagine SEO categoria × comune, landing *Sei un professionista?*.
- *App screen* (`references/app-screens.md`, `--app`): risultati di ricerca, profili partner e agenzia, confronto, modulo richiesta di contatto e OTP, area cliente, registrazione e abbonamento, Area Partner, Area Commerciale, Backoffice Admin.

**Comandi, sempre con brand fisso**
- `draw.mjs ... --keep palette,type` (con `--app` per le app screen): si mappano i colori sui token PRD §11.1 e si usano Fraunces (titoli) + DM Sans (testo).
- Pagine: `inspect.mjs <pagina> --allow eyebrow,micro-label,numbering,palette-cream,icon-cards,outlined-box,card-rows,shadow`
- App screen: `inspect.mjs <pagina> --app --allow micro-label,palette-cream,radius-mix` (in modalità `--app` la skill tollera già eyebrow, numerazione, bordi, card e ombre).
- `lint.mjs` non ha `--allow`: i suoi FAIL sulle voci sotto sono attesi e vanno citati nel report, non "corretti".

**Eccezioni ammesse (e solo queste)**

| Regola della skill | Cosa resta nel progetto | Perché |
|---|---|---|
| `eyebrow`, `micro-label` | Stile *Overline* (DM Sans Bold 12, maiuscolo) per etichette di contesto ("VENEZIA · PADOVA · TREVISO", "REGISTRAZIONE PARTNER") e **sempre** per "Sponsorizzato" | Brand approvato; l'etichetta dei contenuti sponsorizzati è obbligatoria (PRD §7.3, §16, Omnibus/P2B) |
| `numbering` | "Passo 2 di 5" e stepper numerati nel modulo lead e nella registrazione; i 3 passi di *Come funziona* in Home. Sempre come `<ol>` | Processi davvero ordinati (PRD §5.1, §5.5, §6.1) |
| `palette-cream` | Sfondo `--crema-50` | Palette PRD §11.1 |
| `outlined-box`, `card-rows` | Componenti *Card partner*, *Riga lead*, campi del form con bordo `border/default` | Componenti approvati; i risultati sono un elenco da confrontare |
| `icon-cards` | Componente *Tile categoria* della Home (icona + categoria + conteggio) | Componente approvato |
| `shadow` | Solo barra di ricerca della Home, fumetto del geco, menu e dialog | Elementi che galleggiano davvero |
| `radius-mix` | Raggi dei token `radius/*` (6, 10, 16, 24, pill) | Token Figma |

Tutto il resto delle regole della skill vale: niente gradienti, glow, glass, emoji, monospace, numerazioni decorative (01/02/03), accent word nei titoli; titoli su massimo due righe; contrasto AA (mai testo bianco su `--salvia-500`).

**Contenuti**
- Il geco è animato in ogni posa (componente `Geco`, fermo con "riduci movimento"). Le pose che muovono un braccio (saluto, casa, professionista, partner, recensioni) sono WebP animati in `public/geco/anim/`, generati da `design/geco/anima.mjs` (il braccio si piega alla giuntura: mai più pezzi rigidi che ruotano sopra il corpo, si vedevano staccati; controllare con `--prove`). Il razzo usa gli strati in `public/geco/parti/` (da `design/geco/split_parti.py`), le altre pose le classi `geco-*` in `globals.css`. Usare sempre `<Geco>` invece di `<Image src="/geco/...">`.
- Il geco (illustrazioni in `design/geco/`) è l'identità del brand e resta. Non conta come "foto reale": le pagine pubbliche devono comunque avere immagini vere (portfolio dei partner, foto del Veneto da `assets.mjs` con credito nel footer).
- Mai recensioni, clienti, numeri o loghi inventati sulle pagine pubbliche: le recensioni vengono solo da lead verificati (PRD §5.6). I dati di esempio nelle schermate vanno indicati come tali nel report.
- Restano obbligatori: nota "prezzi indicativi" (PRD §5.4, §6.3), avviso che il geco è un'IA (AI Act), etichetta sui contenuti sponsorizzati.

**Manutenzione**
- Non modificare i file in `.claude/skills/design-taste-frontend/`: `npx skills update` li sovrascrive (hash in `skills-lock.json`). Le eccezioni stanno qui.
- La skill scrive in `.taste-skill/` (bozze, screenshot): aggiungerla a `.gitignore` quando si fa `git init`.
- Gli script richiedono Node 22+ e Chrome o Edge installati.

## Agenti (tool `Agent`) — solo se richiesto esplicitamente

- `Explore` / `Plan` — esplorazione e pianificazione.
- `frontend-mobile-development:frontend-mobile-development-frontend-developer`, `ui-design:ui-designer`, `ui-design:accessibility-expert`.
- `backend-development:backend-development-backend-architect`, `database-design:database-design-database-architect`, `database-design:sql-pro`.
- `payment-processing:payment-integration` — Stripe.
- `backend-api-security:backend-api-security-backend-security-coder`, `comprehensive-review:comprehensive-review-security-auditor`.
- `unit-testing:unit-testing-test-automator`, `pw:test-architect`, `pw:test-debugger`.
- `debugging-toolkit:debugging-toolkit-debugger`.
- `javascript-typescript:typescript-pro`.

## Plugin e MCP

- **context7** — documentazione aggiornata di Next.js, Supabase, Stripe, Drizzle/Prisma, Tailwind, shadcn/ui, MapLibre: usarlo invece di andare a memoria.
- **playwright** (MCP) / **claude-in-chrome** — verifica UI nel browser, screenshot, console.
- **figma** — design-to-code.
- **github** — attualmente **non connesso** (errore di autorizzazione): usare `gh` CLI finché non viene sistemato il token.
- **typescript-language-server** (LSP) — diagnostica tipi.
- **format-code** (hook) — formattazione automatica.
- **protect-tests** (hook) — impedisce di indebolire i test.
- Hook **caveman** — risposte in chat stringate; file, codice e commit restano in prosa normale.

## Decisioni aperte (PRD §20)

Prima di implementare parti che ne dipendono, chiedere all'utente: nome piattaforma/mascotte, esclusiva di zona, agenzie non partner, regole token e lead oltre quota, prezzi piani, tolleranza pagamento, prova gratuita, modello B2B, import immobili, area cliente, provvigioni commerciali, tono tu/lei, provider email/SMS/SdI. (ORM deciso: Drizzle.) Nel frattempo si usano i valori provvisori del Figma elencati in "Stato dello sviluppo".
