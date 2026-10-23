/**
 * PostgreSQL locale per lo sviluppo, senza installazioni di sistema: un server PostgreSQL vero
 * avviato da node_modules (pacchetto embedded-postgres). L'app vi si collega con DATABASE_URL
 * come farà con Supabase in produzione. I dati restano in .data/postgres.
 */
import { existsSync } from "node:fs";
import { connect } from "node:net";
import EmbeddedPostgres from "embedded-postgres";

const portInUse = (port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = connect({ port, host: "127.0.0.1" }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });

async function main() {
  const databaseDir = process.env.PG_DATA_DIR ?? ".data/postgres";
  const port = Number(process.env.PG_PORT ?? 54329);

  if (await portInUse(port)) {
    // Un database è già in ascolto (per esempio avviato da un'altra finestra): lo riusiamo.
    console.log(`[db] PostgreSQL già in esecuzione su 127.0.0.1:${port}`);
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
