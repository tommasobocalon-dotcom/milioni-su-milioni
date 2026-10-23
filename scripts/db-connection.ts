import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";

/** Connessione per gli script da terminale (migrazioni, seed). */
export function connect() {
  const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/postgres";
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  return { sql, db: drizzle(sql, { schema }) };
}
