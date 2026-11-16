# CLAUDE.md — Piattaforma Casa & Professionisti

Guida per Claude Code su questo progetto. Fonte di verità del prodotto: `prd.md` (leggilo prima di qualsiasi lavoro su funzionalità). PDF di contesto: `masterplan.pdf`, `previsione e monetizzazione.pdf`, `top piano.pdf` (pesante, ~16 MB: leggere solo le pagine necessarie).

## Progetto in breve

Aggregatore web (Veneto → Triveneto → Nord Italia) che mette in contatto clienti con agenzie immobiliari, tecnici, artigiani e partner B2B.
- **B2C**: *Trova Casa*, *Trova Professionista / Artigiano*, profili pubblici, richiesta di contatto guidata con OTP. Le recensioni (verificate e Google) sono state tolte dal sito l'11/11/2026: tabella `reviews` e `partners.google_place_id` restano solo come storico.
- **B2B**: abbonamenti Stripe (Base / Normal / Premium, mensile o annuale) + **pacchetti di visibilità in euro** (logo in Home, boost nella ricerca, estensione per comune); i token/crediti sono stati tolti del tutto l'11/11/2026. Sospensione automatica al pagamento fallito.
- **Area Commerciale** (vendita porta a porta, mobile), **Backoffice Admin**, **assistente AI** (mascotte geco) lato cliente e partner.
- Stato (ottobre 2026): **MVP navigabile in sviluppo**, vedi "Stato dello sviluppo" sotto e [README.md](README.md) per avviarlo.

## Stack (PRD §12, con le scelte fatte)

| Livello | Scelta |
|---|---|
| App | **Next.js 16** (App Router, Cache Components + Partial Prefetching attivi) + TypeScript, unico progetto. Leggere `node_modules/next/dist/docs/` prima di usare API di Next: è cambiato molto (vedi `AGENTS.md`) |
| UI | Tailwind CSS 4 con i token del Figma in `src/app/globals.css`; componenti propri in stile shadcn (cva + tailwind-merge) in `src/components/ui` |
| DB | PostgreSQL (Supabase UE in produzione). In locale **embedded-postgres** avviato da `npm run dev` (porta 54329, dati in `.data/postgres`). Distanze calcolate in TypeScript; PostGIS e pgvector quando servono |
| ORM | **Drizzle** (deciso): schema in `src/lib/db/schema.ts`, migrazioni SQL in `drizzle/` |
| Auth | **Email + password (hash scrypt) e accesso con Google / Apple (OpenID Connect, codice in `src/lib/auth/oauth.ts`, senza librerie) + sessioni nel database** (cookie httpOnly, token salvato come hash). I lead si confermano con un codice via email (OTP, dal 14/11/2026 niente più SMS). Collegamento a un account esistente solo con email verificata dal provider; blocco dopo 10 password sbagliate in 15 minuti (registro in `audit_logs`). Supabase Auth non usato per ora. Recupero password e conferma email con link monouso (tabella `auth_tokens`, solo hash; email via `src/lib/notify`, Resend in produzione). Autorizzazione nell'app: ogni pagina/azione dell'Area Partner passa da `requirePartner()`, e le sue query passano da `asPartner()` (`src/lib/db/tenant.ts`): ruolo PostgreSQL `geco_partner` con policy RLS che mostrano solo le righe dell'azienda della sessione (migrazione `0029_rls_area_partner`, 16/11/2026; test in `src/lib/db/tenant.test.ts`). Pagine pubbliche, gestionale e Stripe restano sul ruolo dell'app, proprietario delle tabelle e fuori dalla RLS |
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
- **Dati in UE**, GDPR, AI Act (quando l'assistente sarà attivo dovrà dichiarare di essere un'IA; finché non c'è, nessun riferimento all'intelligenza artificiale sul sito, su richiesta del cliente), contenuti sponsorizzati sempre etichettati.
- **Sicurezza**: RLS su ogni tabella dei partner (nuove query dell'Area Partner sempre dentro `asPartner()`; una tabella nuova con `partner_id` va aggiunta alle policy di `geco_partner`), segreti solo in variabili d'ambiente, rate limiting, pratiche OWASP.
- **Denaro**: webhook Stripe idempotenti (chiavi in `stripe_processed`), effetti dei pagamenti una volta sola. Niente più token: le tabelle `token_ledger` e le colonne `tokens_*`/`renewal_tokens` restano solo come storico, il codice non le usa.
- **Accessibilità**: WCAG 2.1 AA. Palette: non usare `--salvia-500` come sfondo per testo bianco.
- **Palette definitiva** (cliente, 9/11/2026, token in `src/app/globals.css`): principale `#243e36` bosco (`brand`, `primary`), secondario `#c9d4c4` salvia chiaro (`brand-soft`, scala `salvia-*`), terziario `#f6f3fd` lavanda chiaro (prima `#e6e0f8`, poi `#f1edfc`, schiarito due volte su richiesta del cliente) (`tertiary`, **solo** in Trova professionista, al posto dell'oro su Partner Elite e riquadro in evidenza, prop `lavender` di `PartnerCard`/`FeaturedPartner`, e sul badge Partner Elite delle schede pubbliche delle aziende, 13/11/2026; le schede Partner Pro hanno bordo e fascia verdi su bianco e, solo con boost attivo, tutta la scheda in velatura salvia `sage-wash`), sfondo `#f8f7f4` bianco osso (`page`) che in Home si alterna al bianco (`surface`) sezione per sezione. Sulle barre scure (sidebar, footer) la voce attiva è `bosco-600` e l'hover `bosco-700`, perché `primary` coincide con lo sfondo.
- **Colore delle promo** (soci, 11/11/2026, scartati oro, lilla, rosso, arancione e pesca): lime, token `promo` con testo `ink` (mai bianco), `promo-soft` per i riquadri, `promo-ink` per testo e icone su bianco; si cambia solo in `globals.css`. Solo per promo e sconti.
- **Mobile-first**, PWA per partner e commerciali.
- **Test**: TDD dove possibile (Vitest unit, Playwright E2E). Non modificare i test per farli passare (plugin `protect-tests` attivo).
- **E2E isolati**: `npx playwright test` avvia un proprio server sulla porta 3100 (cartella `.next-e2e`) con il database `geco_e2e` e azzera solo quello (`db-reset` rifiuta gli altri). Il database `postgres` di `npm run dev` non viene mai toccato.
- **Migrazioni**: il campo `when` di ogni voce in `drizzle/meta/_journal.json` deve essere più grande di quello della precedente (alcune sono nel futuro): Drizzle salta in silenzio una migrazione più vecchia dell'ultima applicata. Dopo `drizzle-kit generate` controllarlo.
- Ambiente: **Windows 11**, shell PowerShell 5.1 (niente `&&`) oppure Git Bash.
- Repo git nella cartella del progetto (branch `main`), Git per Windows installato. In PowerShell 5.1 non riscrivere file con `Get-Content`/`Set-Content` (rompe gli accenti UTF-8): usare gli strumenti di modifica file.
- Con Cache Components: letture di cookie, `searchParams`, `params` e dati non in cache vanno dentro `<Suspense>`; prima di `new Date()` in un componente chiamare `await connection()`. Verificare sempre con `npm run build` e controllando la console (insight di Next).

## Stato dello sviluppo

**Fatto e testato** (254 test unitari, 40 end-to-end, 5 su Stripe sandbox con `npm run test:stripe`, build di produzione ok):
- Home, *Trova Casa*, *Trova Professionista* con filtri, ordinamento (punteggio PRD §7.5) e posti sponsorizzati etichettati; ricerca libera `/cerca` ("rifare il bagno a Mestre").
- Home rifatta sul modello di thumbtack.com (novembre 2026, componenti in `src/components/site/home/`): navbar con Esplora / Area clienti (`/accedi`) / Area aziende (`/accedi/azienda`) e ricerca compatta quando quella della hero esce dallo schermo; hero a tutta pagina con video in `public/hero/` (`HERO_SLIDES`, compressi con ffmpeg senza audio, poster = primo fotogramma; uno dopo l'altro, in loop se è uno solo; pausa, fermi con "riduci movimento") senza numeri di partner (tolti su richiesta dei soci il 15/11/2026, all'inizio sono pochi); due riquadri gemelli di tessere (Trova un professionista: le 5 categorie con più partner + "Tutti"; Trova un'agenzia: comprare, vendere, affittare, APE + "Tutte"), sempre 6 per lato; fascia loghi "Aziende in evidenza" = partner con un boost "home" attivo (`getHomeSponsors`; etichetta "Sponsorizzato" tolta su richiesta del cliente il 10/11/2026, il pagamento è detto nel testo sotto il titolo); *Come funziona* con telefono che cambia schermata; province con slogan, mappa dai confini ISTAT (`src/lib/data/veneto-map.ts`) e "Cerca la tua città"; footer a colonne con crediti di foto e mappa. Entrate allo scroll in solo CSS (`[data-reveal]`, animation-timeline).
- Tutti i 560 comuni del Veneto (elenco ISTAT, migrazione `0018_comuni_veneto`, coordinate = baricentro dai confini ISTAT); frazioni cercabili (`aliases`) solo per pochi comuni, scritte a mano.
- Profili pubblici agenzia e professionista con listino indicativo, portfolio, dati strutturati `LocalBusiness`, URL del PRD §5.4.
- Richiesta di contatto in 5 passi con domande dinamiche per categoria, conferma con codice via email (OTP; niente più SMS dal 14/11/2026, nessun riferimento agli SMS sul sito), controllo dei duplicati (PRD §7.4; richieste gratis e illimitate per tutti), pagina di conferma con alternative.
- Accessi separati per clienti (`/accedi`, Area cliente e gestionale) e aziende (`/accedi/azienda`, Area Partner): stesso account, due cookie di sessione (`geco_session`, `geco_session_azienda` in `src/lib/auth/session.ts`), entrare da una parte non apre l'altra. Area Partner: accesso solo con email e password (Google/Apple solo per i clienti, novembre 2026; recupero password con `?per=azienda` che riporta all'area aziende), panoramica, inbox e dettaglio lead (stato, note, segnalazione entro 72 h), Boost e sponsorizzazioni (`/area-partner/sponsorizzazioni`, prima `/token` con rinvio: logo in Home, boost nella ricerca, estensione per comune, pagati in euro), listino, abbonamento, Profilo (`/area-partner/profilo` in sola lettura, `/area-partner/profilo/modifica` per titolare, azienda, contatti, specializzazioni, anno di fondazione e orari; parser in `src/lib/domain/profile-fields.ts`).
- Stripe (codice in `src/lib/billing/stripe.ts`, webhook `/api/stripe/webhook`): Checkout abbonamento mensile/annuale e pacchetti in euro (carta + SEPA, IVA 22%), Customer Portal, webhook firmato e idempotente (tabella `stripe_processed`), sospensione immediata al pagamento fallito e riattivazione automatica, un solo abbonamento per azienda (il Checkout controlla anche Stripe), account con più aziende (azienda scelta dal menu in Area Partner, cookie `geco_azienda`, altrimenti la prima registrata; test in `e2e/multi-company.spec.ts`), discesa di piano programmata dal portale mostrata in pagina abbonamento (`pendingPlanChange`) e tolta da un cambio piano successivo, regalo del logo in Home col primo incasso del Premium annuale in promo. Prezzi, IVA, portale clienti e webhook creati in Stripe da `npm run stripe:setup` (sandbox "geco italia" attiva dal 5/11/2026; online bastano `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`, già su Vercel). Al ritorno dal Checkout `/api/stripe/ritorno` rilegge la sessione da Stripe e applica subito piano e pacchetti (stessi effetti idempotenti del webhook): in locale funziona senza Stripe CLI. Configurazione in `DEPLOY.md`.
- Registrazione partner self-service `/registrazione-partner` (PRD §6.1): account con ritorno automatico (`/accedi?next=`), dati azienda con controllo P.IVA, SDI o PEC, scheda creata "in attivazione" e nascosta finché il piano non è pagato; senza Stripe, in sviluppo e sul sito di prova, attivazione del piano senza pagamento.
- Email con Brevo (`src/lib/notify`, API in `src/lib/domain/brevo.ts`), attive con `EMAIL_PROVIDER=brevo`; codice della richiesta non inviato = messaggio chiaro al cliente, email dopo la conferma mai bloccanti. `sendSms` resta nel codice ma non è usato. Guida in `DEPLOY.md`.
- Pagine *Come funziona* (solo per chi cerca) e *Come ordiniamo i risultati* (`/come-ordiniamo-i-risultati`, classifica e sponsorizzati, spostati lì il 15/11/2026; ci rimandano footer, risultati, fascia loghi della Home, Chi siamo e Assistenza), *Per i professionisti* (piani), privacy e termini in bozza, 404.
- Gestionale `/admin` (PRD §10, prima parte), app a sé: con `ADMIN_URL` vive solo sul suo dominio (`admin.gecoitalia.it`, regola in `src/lib/domain/admin-host.ts` usata da `src/proxy.ts`; sul sito `/admin` dà 404), pagina di accesso propria `/admin/accedi`, installabile (manifest e icone in `public/gestionale/`). Accesso con ruolo `admin` o email in `ADMIN_EMAILS` confermata (`requireAdmin()`, 404 per gli altri), panoramica (MRR, partner, lead, sponsorizzazioni, cose da fare), assistenza a ticket (modulo pubblico `/assistenza`, Area Partner → Assistenza, email in arrivo via webhook `/api/assistenza/email` con Resend firmato o token; risposte per email con `[geco #N]` nell'oggetto, note interne, stato, presa in carico), partner (ricerca, verifica/badge, sospensione e riattivazione; scheda con ultime richieste, sponsorizzazioni e link a Stripe), richieste dei clienti (`/admin/richieste`: consegnate, senza contatti, non consegnate, codice non confermato, segnalate; esito in `leadOutcome`), abbonamenti (`/admin/abbonamenti`), sponsorizzazioni (`/admin/sponsorizzazioni`, logo in Home, boost e comuni in più), "Da fare oggi" con i segnali da seguire (sospesi, iscritti senza piano da 3 giorni, gratuiti al limite, sponsorizzazioni in scadenza, codici non confermati). Velocità (15/11/2026): `requireAdmin()` in `cache()` con una sola query, panoramica in 3 letture (contatori in un'unica SQL), indici `audit_logs_created_idx` e `leads_created_idx` (migrazione `0026`); segnalazioni lead (accolta = il lead non conta più), registro attività. Codice in `src/app/admin`, `src/lib/support`, `src/lib/data/admin.ts`.

**Da fare** (prossimi passi suggeriti): fatturazione elettronica SdI collegata al webhook Stripe, Area Partner ridotta al solo pagamento quando l'account è sospeso, resto del Backoffice (tassonomia, zone, piani e coupon, contenuti/FAQ, pesi del ranking, commerciali, impersonificazione in sola lettura), invito dei commerciali con piano precompilato, editor della scheda/listino/portfolio con upload foto, mappa MapLibre, ricezione email dell'assistenza (ATTIVAZIONE-SERVIZI.md §4), RLS anche per profilo dell'azienda e area cliente, Area Commerciale, assistente AI, deploy (Vercel + Supabase UE).

**Piani e classifica decisi dal cliente** (documento "Costo e funzioni definitive secondo Alvise", 4/11/2026; dettagli nella memoria `billing-decisions`): Base 39 €/mese o 348 €/anno (soci, 11/11/2026, migrazione `0017_prezzo_base`); dall'11/11/2026 listino Normal 89 €/mese (prima 69) o 828 €/anno, Premium 199 €/mese (migrazione `0017_prezzo_base`) o 1908 €/anno (migrazione `0016_prezzi_lancio`), con promo sul primo pagamento (`planPromo` in `src/lib/domain/offers.ts`, coupon Stripe `repeating` di 1 mese, così non lo consuma la fattura a 0 € della prova): primo mese sempre 39 / 79 €, annuale 599 / 1490 € solo nei 6 mesi da `LANCIO_SITO`, Premium annuale con 30 giorni di logo in Home in regalo al primo incasso (metadato `giftHomeDays`); stessa promo nel cambio piano, salendo o scendendo (12/11/2026, prima solo salendo), una volta per azienda e mai sul piano attuale (`changePromo`, `changePlanWithPromo` in `src/lib/billing/stripe.ts`: nuovo periodo da subito, prezzo promo meno i giorni non usati; chiave `change-promo:<partner>` in `stripe_processed`); niente crediti in vendita sulla pagina *Per i professionisti*; richieste dei clienti gratis e illimitate per tutti (niente quota né sblocco); 7 giorni di prova con carta; **piano gratuito di lancio** (soci, 15/11/2026, `src/lib/domain/free-plan.ts`): chi si iscrive nei 6 mesi da `LANCIO_SITO` e non ha mai avuto un abbonamento può scegliere "Inizia gratis" in Area Partner → Abbonamento (`startFreePlan`), cioè un Base senza Stripe (`subscriptions.free`, migrazione `0024_piano_gratuito`) finché non riceve 3 richieste nello stesso mese di calendario (ora italiana, segnalazioni accolte escluse); dalla 4ª il lead arriva `charge = 'locked'`: tipo di lavoro, comune e tempi visibili, nome, contatti, descrizione e risposte nascosti già nella query (`src/lib/data/partner-area.ts`); scelto un piano (`syncSubscription` o attivazione di prova) il gratuito si chiude e `unlockLeads` sblocca tutto; chi arriva dal gratuito paga subito (niente 7 giorni di prova) ma ha le promo garantite anche dopo i 6 mesi (`planPromo(..., { guaranteed })`, `hadFreePlan`); escluso dall'MRR del gestionale, dove compare "Gratuito"; annunciato in *Per i professionisti* e nel pannello verde a destra dell'accesso aziende, sotto il modulo sul telefono (`FreeLaunchOffer` in `src/app/accedi/auth-screen.tsx`, riquadro `promo-soft`), che spariscono da soli a fine lancio (`getFreePlanOpen`); test in `e2e/free-plan.spec.ts`; due boost separati (tabella `boosts`, colonna `placement`), solo Normal e Premium: "Sponsorizzato nella ricerca" (`search`, riquadro grande e primi posti del proprio piano) **pagato in euro**: 24 h 15 €, 48 h 25 € + IVA (`SEARCH_BOOST_PACKAGES`, Checkout `kind: search_boost`, `grantSearchBoost`), e "Logo in evidenza in Home" (`home`, fascia loghi senza limite, ordine mescolato nel browser a ogni visita) **pagato in euro con Stripe** (soci, 10/11/2026): 7 giorni 79 € (promo 39) e 30 giorni 249 € (promo 99) + IVA, promo per 6 mesi da `LANCIO_SITO` (`HOME_SPONSOR_PACKAGES` in `src/lib/domain/offers.ts`, Checkout `kind: home_sponsor`, `grantHomeSponsor`); il Base non compra pacchetti; righe dei piani in `src/lib/domain/plan-features.ts`. Classifica di Trova professionista/agenzia in `src/lib/domain/ranking.ts`: dopo il filtro categoria + zona, riquadro grande a un Premium (con boost se c'è) e poi Premium+boost, Premium, Normal+boost, Normal, Base; tra pari grado ordine a rotazione per visitatore (cookie di sessione `geco_visita`). Spiegata su *Come ordiniamo i risultati* (P2B/Omnibus). Estensione territoriale **per comune**, pagata in euro (soci, 10/11/2026): 49 € + IVA per comune ogni 30 giorni, qualsiasi comune del Veneto, quanti se ne vuole, solo Normal e Premium (tabella `area_extensions.municipality_id`, entra nel filtro zona della ricerca; `AREA_EXTENSION_OFFER`, Checkout `kind: area_extension`, `grantAreaExtensions`); la vecchia estensione a provincia a crediti è stata tolta (migrazione `0015_solo_comuni`). Lavoro in evidenza nella pagina pubblica `/ispirazione` (tabella `showcase_features`): mostra solo quelli già attivi, nessun modo di comprarlo finché non ha un prezzo in euro. Limiti del piano applicati: progetti nel portfolio (5/25/illimitati; ogni progetto da 2 a 8 foto con titolo e descrizione fino a 300 caratteri, colonna `portfolio_items.photos`, foto ridotte nel browser per stare nei 4 MB di una richiesta; li pubblica solo l'azienda da Area Partner → Lavori e foto (`/area-partner/lavori`, voce di menu a sé) e compaiono in scheda e in `/ispirazione` (filtri nell'URL: Tutti / Professionisti per tipo / Agenzie per tipo di contratto, `src/lib/domain/showcase-filter.ts`; contratti degli immobili in `src/lib/domain/property-contract.ts`: vendita, affitto, asta, affitto con riscatto, nuda proprietà, affitto transitorio, migrazione `0025_tipi_contratto`, 15/11/2026), dove ogni riquadro mostra la foto principale e apre la pagina del lavoro `/ispirazione/[id]` con galleria scorrevole, descrizione e "Richiedi contatto" all'azienda, test in `e2e/ispirazione.spec.ts` con foto Unsplash in `e2e/fixtures/unsplash`; 5 lavori di esempio con le stesse foto in `public/esempi/lavori`, aggiunti dalla migrazione `0021_lavori_esempio` solo alle aziende di esempio del seed), video YouTube/Vimeo solo Premium (`videoEmbedUrl` in `src/lib/domain/extras.ts`), statistiche solo Normal e Premium. Nome "geco" e tono "tu" ancora provvisori.

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
- `draw.mjs ... --keep palette,type` (con `--app` per le app screen): si mappano i colori sui token PRD §11.1 e si usano Manrope (titoli) + Inter (testo), scelti dal cliente il 6/11/2026 al posto di Fraunces + DM Sans del Figma.
- Pagine: `inspect.mjs <pagina> --allow eyebrow,micro-label,numbering,palette-cream,icon-cards,outlined-box,card-rows,shadow`
- App screen: `inspect.mjs <pagina> --app --allow micro-label,palette-cream,radius-mix` (in modalità `--app` la skill tollera già eyebrow, numerazione, bordi, card e ombre).
- `lint.mjs` non ha `--allow`: i suoi FAIL sulle voci sotto sono attesi e vanno citati nel report, non "corretti".

**Eccezioni ammesse (e solo queste)**

| Regola della skill | Cosa resta nel progetto | Perché |
|---|---|---|
| `eyebrow`, `micro-label` | Stile *Overline* (Inter Bold 12, maiuscolo) per etichette di contesto ("VENEZIA · PADOVA · TREVISO", "REGISTRAZIONE PARTNER") e **sempre** per "Sponsorizzato" | Brand approvato; l'etichetta dei contenuti sponsorizzati è obbligatoria (PRD §7.3, §16, Omnibus/P2B) |
| `numbering` | "Passo 2 di 5" e stepper numerati nel modulo lead e nella registrazione; i 3 passi di *Come funziona* in Home. Sempre come `<ol>` | Processi davvero ordinati (PRD §5.1, §5.5, §6.1) |
| `palette-cream` | Sfondo `--crema-50` | Palette PRD §11.1 |
| `outlined-box`, `card-rows` | Componenti *Card partner*, *Riga lead*, campi del form con bordo `border/default` | Componenti approvati; i risultati sono un elenco da confrontare |
| `icon-cards` | Componente *Tile categoria* della Home (icona + categoria + conteggio) | Componente approvato |
| `shadow` | Solo barra di ricerca della Home, menu e dialog | Elementi che galleggiano davvero |
| `radius-mix` | Raggi dei token `radius/*` (6, 10, 16, 24, pill) | Token Figma |

Tutto il resto delle regole della skill vale: niente gradienti, glow, glass, emoji, monospace, numerazioni decorative (01/02/03), accent word nei titoli; titoli su massimo due righe; contrasto AA (mai testo bianco su `--salvia-500`).

**Contenuti**
- **Niente gechi illustrati sul sito** (deciso dal cliente il 6/11/2026): la mascotte è stata tolta ovunque, componente `Geco` e animazioni CSS eliminati (le illustrazioni restano in `design/geco/` e `public/geco/`, non usate). Il marchio nel sito è solo la scritta **GECOITALIA** (Unbounded 800, solo le lettere del logo in `src/app/fonts/unbounded-logo.woff2`, classe `font-wordmark`; componente `Wordmark`, deciso dal cliente il 9/11/2026; `text-on-brand` sugli sfondi scuri); il logo con casa e geco resta in `public/logo/gecoitalia-tondo.png`, non usato. Favicon e icone in `src/app/icon.png`, `apple-icon.png`, `favicon.ico`, icone del gestionale in `public/gestionale/`; anteprima dei link in `src/app/opengraph-image.jpg`. Titolo del sito "GecoItalia — …". Le pagine pubbliche devono comunque avere immagini vere (portfolio dei partner, foto del Veneto da `assets.mjs` con credito nel footer).
- Mai clienti, numeri o loghi inventati sulle pagine pubbliche; niente recensioni né voti (tolti su richiesta dei soci, 11/11/2026). I dati di esempio nelle schermate vanno indicati come tali nel report.
- Restano obbligatori: nota "prezzi indicativi" (PRD §5.4, §6.3), etichetta sui contenuti sponsorizzati.

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

Prima di implementare parti che ne dipendono, chiedere all'utente: nome piattaforma/mascotte, esclusiva di zona, agenzie non partner, regole dei lead, prezzi piani, tolleranza pagamento, prova gratuita, modello B2B, import immobili, area cliente, provvigioni commerciali, tono tu/lei, provider SdI. (ORM deciso: Drizzle.) Nel frattempo si usano i valori provvisori del Figma elencati in "Stato dello sviluppo".
