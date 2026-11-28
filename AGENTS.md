<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Lavoro in squadra con Claude
In questo progetto lavori insieme a Claude: Claude coordina, tu esegui i compiti che ti assegna.
- Modifica solo i file indicati nel compito. Se per finire devi toccarne altri, fermati e scrivi quali e perché.
- Non fare commit, merge, rebase o push: li fa Claude.
- Se ti chiedono una revisione, non modificare nessun file: elenca i problemi con file:riga, gravità e correzione suggerita.
- Non toccare file condivisi (package.json, package-lock.json, next.config.ts, tsconfig.json, drizzle/, configurazioni di build) se il compito non lo chiede esplicitamente.
- Non aprire, copiare né riportare il contenuto dei file `.env*`: contengono chiavi e password.
- Se esiste .coordinamento/PIANO.md, non lavorare sui file assegnati a Claude o ad altri compiti in corso.
