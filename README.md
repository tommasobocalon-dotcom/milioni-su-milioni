# geco — Piattaforma Casa & Professionisti

Aggregatore che mette in contatto chi cerca casa o lavori per la casa con agenzie, tecnici e artigiani verificati del Veneto. Prodotto descritto in [prd.md](prd.md); design nel file Figma *Piattaforma Casa & Professionisti — Bozza UI*.

## Avvio in locale

Serve **Node.js 22 o più recente**. Niente Docker, niente installazioni di database: PostgreSQL parte da `node_modules`.

```bash
npm install
```

```bash
copy .env.example .env.local
```

```bash
npm run dev
```

Apri http://localhost:3000. Al primo avvio il database locale viene creato in `.data/postgres` e riempito con i dati di esempio.

- **Area Partner**: http://localhost:3000/accedi con `mario@rossiimpianti.it` e password `geco-demo-2026` (Rossi Impianti). Per entrare come cliente: "Crea account" con qualsiasi email. Google e Apple funzionano solo dopo aver compilato le variabili `GOOGLE_*` / `APPLE_*` in `.env.local` (istruzioni in `.env.example`); in sviluppo SMS ed email non partono: i codici compaiono a schermo e nel terminale.
- **Richiesta di contatto**: da qualsiasi profilo, "Richiedi contatto". Anche qui il codice SMS compare a schermo.
- **Gestionale** (Backoffice, app a sé con la sua pagina di accesso): http://localhost:3000/admin con `admin@gecoitalia.it` e la stessa password `geco-demo-2026`. Online vive su `admin.gecoitalia.it` e si installa come app su computer e telefono ([DEPLOY.md](DEPLOY.md), passo 4b). Assistenza (richieste dal sito, dall'Area Partner e per email), partner (verifica, sospensione, token omaggio), segnalazioni dei lead, recensioni, registro attività. Sul sito di prova (con `SITE_ACCESS` e `DEMO_MODE=1`) lo stesso account viene creato al deploy; sul sito pubblico si entra con le email di `ADMIN_EMAILS` ([ATTIVAZIONE-SERVIZI.md](ATTIVAZIONE-SERVIZI.md), sezione 4).

## Sito di prova online

https://gecoitalia.it, riservato al team con nome e password: come pubblicarlo in [DEPLOY.md](DEPLOY.md).

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Database locale + sito su http://localhost:3000 |
| `npm run db:reset` | Ricrea il database locale con i dati di esempio (a `npm run dev` avviato) |
| `npm run db:generate` | Genera una nuova migrazione SQL dopo aver modificato `src/lib/db/schema.ts` |
| `npm test` | Test unitari (Vitest) della logica di dominio |
| `npm run test:e2e` | Test end-to-end (Playwright, usa Chrome installato). Azzera i dati di esempio |
| `npm run typecheck` · `npm run lint` | Controlli di tipo e stile |
| `npm run build` | Build di produzione (richiede il database avviato) |

## Struttura

```
src/app/(pubblico)/     pagine pubbliche: home, ricerca, profili, richiesta di contatto
src/app/area-partner/   Area Partner: panoramica, lead, sponsorizzazioni, listino, abbonamento, assistenza
src/app/admin/          gestionale: assistenza, partner, segnalazioni, recensioni, registro attività
src/app/api/            webhook Stripe e email in arrivo all'assistenza
src/app/accedi/         accesso e registrazione con email e password
src/app/auth/           ritorno da Google e Apple (OAuth)
src/lib/domain/         regole di business pure e testate (lead, prezzi e promo, OTP, ordinamento)
src/lib/data/           letture dal database (server-only)
src/lib/leads/          consegna dei lead e pacchetti pagati (boost, logo in Home, comuni)
src/lib/support/        ticket di assistenza: apertura, email in arrivo, risposte del team
src/lib/auth/           codici OTP, sessioni, Google/Apple
src/lib/db/             schema Drizzle e connessione
scripts/                database locale, migrazioni, dati di esempio
drizzle/                migrazioni SQL versionate
e2e/                    test Playwright
```
