import { readFileSync, writeFileSync } from "node:fs";

/**
 * Il server dei test (distDir .next-e2e) riscrive next-env.d.ts verso la sua cartella:
 * lo riportiamo su .next, quella di `npm run dev` e della build.
 */
export default function globalTeardown() {
  const file = "next-env.d.ts";
  const content = readFileSync(file, "utf8");
  if (content.includes("./.next-e2e/")) writeFileSync(file, content.replaceAll("./.next-e2e/", "./.next/"));
}
