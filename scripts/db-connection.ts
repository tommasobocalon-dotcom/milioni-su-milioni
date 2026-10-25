import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { databaseUrl } from "../src/lib/db/url";

/** Connessione per gli script da terminale (migrazioni, seed). */
export function connect() {
  const sql = postgres(databaseUrl(), { max: 1, prepare: false, onnotice: () => {} });
  return { sql, db: drizzle(sql, { schema }) };
}
