import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    ".next-pentest/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Skill di terze parti e loro output (non si modificano: `npx skills update` li sovrascrive).
    ".claude/**",
    ".taste-skill/**",
  ]),
]);

export default eslintConfig;
