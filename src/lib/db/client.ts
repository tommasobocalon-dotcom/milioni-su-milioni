import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/postgres";

// In sviluppo il modulo viene ricaricato a ogni modifica: riusa la stessa connessione.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

const sql =
  globalForDb.sql ??
  postgres(url, {
    max: process.env.NODE_ENV === "production" ? 5 : 3,
    // Il pooler di Supabase in modalità transaction non supporta i prepared statement.
    prepare: false,
    onnotice: () => {},
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
