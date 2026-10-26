import { execSync } from "node:child_process";
import { E2E_DATABASE_URL } from "../playwright.config";

/** Ogni esecuzione parte dagli stessi dati di esempio, nel database dei test (lo script rifiuta gli altri). */
export default function globalSetup() {
  execSync("npx tsx scripts/db-reset.ts", { stdio: "inherit", env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL, E2E: "1" } });
}
