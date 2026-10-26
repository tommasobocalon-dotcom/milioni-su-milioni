import { defineConfig } from "@playwright/test";

/** Segreto finto per firmare gli eventi Stripe nei test del webhook (e2e/stripe-webhook.spec.ts). */
export const E2E_STRIPE_WEBHOOK_SECRET = "whsec_e2e_solo_test_locale";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  fullyParallel: false,
  // I test condividono lo stesso database locale: uno alla volta.
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    // E2E_BASE_URL per provare una build di produzione su un'altra porta mentre `npm run dev` è aperto.
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    // Usa Chrome installato sul computer, senza scaricare altri browser.
    channel: "chrome",
    locale: "it-IT",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    env: { STRIPE_WEBHOOK_SECRET: E2E_STRIPE_WEBHOOK_SECRET },
    timeout: 120_000,
  },
});
