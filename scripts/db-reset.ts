/** Svuota il database locale e lo ricrea: migrazioni + dati di esempio. Solo sviluppo. */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { connect } from "./db-connection";
import { seed } from "./seed";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (url && !/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error("db:reset si usa solo sul database locale");
  }
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
