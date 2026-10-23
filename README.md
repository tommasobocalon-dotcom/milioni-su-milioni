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

- **Area Partner**: http://localhost:3000/accedi con `mario@rossiimpianti.it` (Rossi Impianti). In sviluppo email e SMS non partono: il codice compare a schermo e nel terminale.
- **Richiesta di contatto**: da qualsiasi profilo, "Richiedi contatto". Anche qui il codice SMS compare a schermo.

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
src/app/area-partner/   Area Partner: panoramica, lead, token, listino, abbonamento
src/app/accedi/         accesso con codice via email
src/lib/domain/         regole di business pure e testate (lead, token, OTP, ordinamento)
src/lib/data/           letture dal database (server-only)
src/lib/leads/          consegna dei lead: quota, token, duplicati, sblocco
src/lib/auth/           codici OTP e sessioni
src/lib/db/             schema Drizzle e connessione
scripts/                database locale, migrazioni, dati di esempio
drizzle/                migrazioni SQL versionate
e2e/                    test Playwright
```
