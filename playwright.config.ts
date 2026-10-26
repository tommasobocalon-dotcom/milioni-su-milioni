import { defineConfig } from "@playwright/test";

/** Segreto finto per firmare gli eventi Stripe nei test del webhook (e2e/stripe-webhook.spec.ts). */
export const E2E_STRIPE_WEBHOOK_SECRET = "whsec_e2e_solo_test_locale";

/**
 * I test girano su un server e un database tutti loro (porta 3100, database geco_e2e), accanto a
 * `npm run dev` sulla 3000: l'azzeramento dei dati prima di ogni giro non tocca mai quello che si prova a mano.
 */
export const E2E_PORT = 3100;
export const E2E_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:54329/geco_e2e";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 60_000,
  fullyParallel: false,
  // I test condividono lo stesso database: uno alla volta.
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    // E2E_BASE_URL per provare una build di produzione su un'altra porta.
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${E2E_PORT}`,
    // Usa Chrome installato sul computer, senza scaricare altri browser.
    channel: "chrome",
    locale: "it-IT",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx concurrently -k -n db,web "npm:db:server" "next dev --port ${E2E_PORT}"`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: true,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      // I link assoluti (email, Stripe, Google/Apple) devono tornare al server dei test, non a quello sulla 3000.
      APP_URL: `http://localhost:${E2E_PORT}`,
      NEXT_DIST_DIR: ".next-e2e",
      STRIPE_WEBHOOK_SECRET: E2E_STRIPE_WEBHOOK_SECRET,
    },
    timeout: 180_000,
  },
});
