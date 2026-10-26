import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { databaseUrl } from "../src/lib/db/url";

/** Database dei test end-to-end: separato da quello di `npm run dev`, che i test non toccano mai. */
export const E2E_DATABASE = "geco_e2e";

/** Connessione per gli script da terminale (migrazioni, seed). */
export function connect() {
  const sql = postgres(databaseUrl(), { max: 1, prepare: false, onnotice: () => {} });
  return { sql, db: drizzle(sql, { schema }) };
}

/** Crea il database indicato da DATABASE_URL se sul server locale non esiste ancora (es. quello dei test). */
export async function ensureDatabase() {
  const url = new URL(databaseUrl());
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!name || name === "postgres") return;
  url.pathname = "/postgres";
  const admin = postgres(url.toString(), { max: 1, onnotice: () => {} });
  try {
    const [row] = await admin`select 1 from pg_database where datname = ${name}`;
    if (!row) await admin.unsafe(`create database "${name.replaceAll('"', '""')}"`);
  } finally {
    await admin.end();
  }
}
