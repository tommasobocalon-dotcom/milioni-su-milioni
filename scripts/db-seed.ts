import { sql as raw } from "drizzle-orm";
import { connect } from "./db-connection";
import { ensureDemoAdmin, seed } from "./seed";

async function main() {
  const { sql, db } = connect();
  const [{ count }] = await db.execute<{ count: number }>(raw`select count(*)::int as count from partners`);
  if (count > 0) {
    console.log("[db] il database contiene già dati: usa `npm run db:reset` per ricrearlo da zero");
  } else {
    await seed(db);
    console.log("[db] dati di esempio inseriti");
  }
  // Sito di prova (protetto da SITE_ACCESS, con DEMO_MODE=1): l'amministratore di prova del gestionale
  // si aggiunge anche se il database era già pieno. Sul sito pubblico queste variabili non ci sono.
  if (process.env.DEMO_MODE === "1" && process.env.SITE_ACCESS?.trim()) {
    await ensureDemoAdmin(db);
    console.log("[db] amministratore di prova del gestionale presente");
  }
  await sql.end();
}

main().catch((err) => {
  console.error("[db] seed non riuscito:", err);
  process.exit(1);
});
