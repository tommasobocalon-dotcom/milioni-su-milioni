import { execSync } from "node:child_process";

/** Ogni esecuzione parte dagli stessi dati di esempio (solo database locale: lo script lo verifica). */
export default function globalSetup() {
  execSync("npx tsx scripts/db-reset.ts", { stdio: "inherit" });
}
