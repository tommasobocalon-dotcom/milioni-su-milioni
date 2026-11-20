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

/**
 * TLS verso il database per postgres.js. In locale niente TLS. Altrove la connessione è sempre cifrata ("require"), ma
 * senza controllare chi risponde. Con DATABASE_CA_CERT (il certificato CA di Supabase, Database Settings → SSL
 * Configuration) si controllano anche il certificato e il nome del server, come sslmode=verify-full: un intermediario
 * non può fingersi il database. Su Vercel il certificato si può incollare su una riga con \n al posto degli a capo.
 */
export function databaseSsl(
  url: string,
  env: Record<string, string | undefined> = process.env,
): false | "require" | { ca: string; rejectUnauthorized: true } {
  if (/@(127\.0\.0\.1|localhost)[:/]/.test(url)) return false;
  const ca = env.DATABASE_CA_CERT?.trim().replaceAll("\\n", "\n");
  if (!ca) return "require";
  if (!ca.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error("DATABASE_CA_CERT deve contenere il testo del certificato (-----BEGIN CERTIFICATE----- …), non il nome del file");
  }
  return { ca, rejectUnauthorized: true };
}
