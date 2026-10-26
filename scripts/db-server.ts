/**
 * PostgreSQL locale per lo sviluppo, senza installazioni di sistema: un server PostgreSQL vero
 * avviato da node_modules (pacchetto embedded-postgres). L'app vi si collega con DATABASE_URL
 * come farà con Supabase in produzione. I dati restano in .data/postgres.
 */
import { existsSync } from "node:fs";
import { connect as tcpConnect } from "node:net";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import EmbeddedPostgres from "embedded-postgres";
import { connect, ensureDatabase } from "./db-connection";
import { seed } from "./seed";

const portInUse = (port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = tcpConnect({ port, host: "127.0.0.1" }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });

/**
 * Primo avvio: crea il database di DATABASE_URL (es. quello dei test), le tabelle e i dati di esempio,
 * così `npm run dev` basta da solo. Poi applica sempre le migrazioni nuove.
 */
async function prepareDatabase() {
  await ensureDatabase();
  const { sql, db } = connect();
  const [{ exists }] = await sql<{ exists: boolean }[]>`select to_regclass('public.partners') is not null as exists`;
  await migrate(db, { migrationsFolder: "drizzle" });
  if (!exists) {
    await seed(db);
    console.log("[db] tabelle create e dati di esempio caricati");
  }
  await sql.end();
}

async function main() {
  const databaseDir = process.env.PG_DATA_DIR ?? ".data/postgres";
  const port = Number(process.env.PG_PORT ?? 54329);

  if (await portInUse(port)) {
    // Un database è già in ascolto (per esempio avviato da un'altra finestra): lo riusiamo.
    console.log(`[db] PostgreSQL già in esecuzione su 127.0.0.1:${port}`);
    await prepareDatabase();
    setInterval(() => {}, 1 << 30);
    return;
  }

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: true,
    onLog: () => {},
  });

  if (!existsSync(`${databaseDir}/PG_VERSION`)) {
    console.log("[db] primo avvio: creo il database locale…");
    await pg.initialise();
  }
  await pg.start();
  console.log(`[db] PostgreSQL pronto su 127.0.0.1:${port} — dati in ${databaseDir}`);
  await prepareDatabase();

  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[db] avvio non riuscito:", err);
  process.exit(1);
});
