import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

const url = databaseUrl();

// In sviluppo il modulo viene ricaricato a ogni modifica: riusa la stessa connessione.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

const sql =
  globalForDb.sql ??
  postgres(url, {
    max: process.env.NODE_ENV === "production" ? 5 : 3,
    // Connessione cifrata (TLS) verso Supabase anche se la stringa non lo chiede; il database locale non usa TLS.
    ssl: /@(127\.0\.0\.1|localhost)[:/]/.test(url) ? false : "require",
    // Il pooler di Supabase in modalità transaction non supporta i prepared statement.
    prepare: false,
    // Su Vercel le funzioni inattive vengono congelate e il pooler chiude le connessioni: senza questi limiti una
    // connessione già chiusa veniva riusata e la richiesta restava appesa fino al timeout di 300 s (9/11/2026).
    idle_timeout: 5,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
    onnotice: () => {},
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
