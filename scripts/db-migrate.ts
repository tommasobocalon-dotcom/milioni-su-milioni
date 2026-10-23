import { migrate } from "drizzle-orm/postgres-js/migrator";
import { connect } from "./db-connection";

async function main() {
  const { sql, db } = connect();
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("[db] migrazioni applicate");
  await sql.end();
}

main().catch((err) => {
  console.error("[db] migrazione non riuscita:", err);
  process.exit(1);
});
