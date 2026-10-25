const LOCAL = "postgres://postgres:postgres@127.0.0.1:54329/postgres";

/**
 * Stringa di connessione: DATABASE_URL, altrimenti POSTGRES_URL creata su Vercel dall'integrazione
 * Supabase (pooler in modalità transaction), altrimenti il database locale di `npm run dev`.
 * Il parametro "supa" di Supabase non è un'opzione di PostgreSQL e postgres.js lo manderebbe al
 * server come impostazione di connessione: lo togliamo.
 */
export function databaseUrl(env: Record<string, string | undefined> = process.env): string {
  const url = new URL(env.DATABASE_URL || env.POSTGRES_URL || LOCAL);
  url.searchParams.delete("supa");
  return url.toString();
}
