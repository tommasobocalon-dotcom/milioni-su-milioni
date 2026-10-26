/** Svuota il database locale e lo ricrea: migrazioni + dati di esempio. Solo sviluppo. */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { databaseUrl } from "../src/lib/db/url";
import { connect, E2E_DATABASE, ensureDatabase } from "./db-connection";
import { seed } from "./seed";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (url && !/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error("db:reset si usa solo sul database locale");
  }
  // Dai test end-to-end si azzera solo il loro database, mai quello su cui si prova l'app a mano.
  if (process.env.E2E === "1" && new URL(databaseUrl()).pathname !== `/${E2E_DATABASE}`) {
    throw new Error(`i test end-to-end possono azzerare solo il database ${E2E_DATABASE}`);
  }
  await ensureDatabase();
  const { sql, db } = connect();
  await sql.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await migrate(db, { migrationsFolder: "drizzle" });
  await seed(db);
  console.log("[db] database locale ricreato con i dati di esempio");
  await sql.end();
}

main().catch((err) => {
  console.error("[db] reset non riuscito:", err);
  process.exit(1);
});
