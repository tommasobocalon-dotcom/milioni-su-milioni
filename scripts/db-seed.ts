import { sql as raw } from "drizzle-orm";
import { connect } from "./db-connection";
import { seed } from "./seed";

async function main() {
  const { sql, db } = connect();
  const [{ count }] = await db.execute<{ count: number }>(raw`select count(*)::int as count from partners`);
  if (count > 0) {
    console.log("[db] il database contiene già dati: usa `npm run db:reset` per ricrearlo da zero");
  } else {
    await seed(db);
    console.log("[db] dati di esempio inseriti");
  }
  await sql.end();
}

main().catch((err) => {
  console.error("[db] seed non riuscito:", err);
  process.exit(1);
});
