# CLAUDE.md — Piattaforma Casa & Professionisti

Guida per Claude Code su questo progetto. Fonte di verità del prodotto: `prd.md` (leggilo prima di qualsiasi lavoro su funzionalità). PDF di contesto: `masterplan.pdf`, `previsione e monetizzazione.pdf`, `top piano.pdf` (pesante, ~16 MB: leggere solo le pagine necessarie).

## Progetto in breve

Aggregatore web (Veneto → Triveneto → Nord Italia) che mette in contatto clienti con agenzie immobiliari, tecnici, artigiani e partner B2B.
- **B2C**: *Trova Casa*, *Trova Professionista / Artigiano*, profili pubblici, richiesta di contatto guidata con OTP, recensioni verificate.
- **B2B**: abbonamenti Stripe (Base / Media / Professional, mensile o annuale) + **token prepagati** (lead oltre quota, boost, in evidenza). Sospensione automatica al pagamento fallito.
- **Area Commerciale** (vendita porta a porta, mobile), **Backoffice Admin**, **assistente AI** (mascotte geco) lato cliente e partner.
- Stato: solo documentazione, **nessun codice ancora**. Prossimo passo: Fase 0 della roadmap (PRD §18).

## Stack (PRD §12)

| Livello | Scelta |
|---|---|
| App | Next.js (App Router) + TypeScript, unico progetto |
| UI | Tailwind CSS + shadcn/ui, token di brand (PRD §11.1) |
| DB | PostgreSQL su Supabase (UE) con PostGIS + pgvector |
| ORM | Drizzle o Prisma (da decidere) |
| Auth | Supabase Auth (magic link, OTP), Row Level Security |
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
- Ambiente: **Windows 11**, shell PowerShell 5.1 (niente `&&`) oppure Git Bash.
- La cartella non è ancora un repo git a sé (il repo rilevato è la home utente): fare `git init` nella cartella del progetto prima di committare.

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

Prima di implementare parti che ne dipendono, chiedere all'utente: nome piattaforma/mascotte, esclusiva di zona, agenzie non partner, regole token e lead oltre quota, prezzi piani, tolleranza pagamento, prova gratuita, modello B2B, import immobili, area cliente, provvigioni commerciali, tono tu/lei, ORM (Drizzle vs Prisma), provider email/SMS/SdI.
