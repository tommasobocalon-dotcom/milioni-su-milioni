import { defineConfig } from "@playwright/test";

/** Segreto finto per firmare gli eventi Stripe nei test del webhook (e2e/stripe-webhook.spec.ts). */
export const E2E_STRIPE_WEBHOOK_SECRET = "whsec_e2e_solo_test_locale";

/** Token finto del webhook delle email di assistenza (e2e/admin.spec.ts). */
export const E2E_INBOUND_EMAIL_TOKEN = "e2e-token-email-solo-test-locale";

/**
 * I test girano su un server e un database tutti loro (porta 3100, database geco_e2e), accanto a
 * `npm run dev` sulla 3000: l'azzeramento dei dati prima di ogni giro non tocca mai quello che si prova a mano.
 */
export const E2E_PORT = 3100;
export const E2E_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:54329/geco_e2e";

/** ID finti di Google Ads e Meta: fanno comparire il banner dei cookie; gli script veri li blocca e2e/consent.spec.ts. */
export const E2E_GOOGLE_ADS_ID = "AW-000000000";
export const E2E_META_PIXEL_ID = "000000000000000";

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
    // Cookie già rifiutati: il banner non copre i bottoni degli altri test (lo prova e2e/consent.spec.ts).
    storageState: {
      cookies: [{ name: "geco_consenso", value: "v1%3A0", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }],
      origins: [],
    },
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
      // I test non chiamano Stripe: anche con la chiave in .env.local si usa l'attivazione di prova.
      STRIPE_SECRET_KEY: "",
      // Niente email vere dai test anche con Brevo attivo in .env.local: codici e link restano a schermo.
      EMAIL_PROVIDER: "console",
      INBOUND_EMAIL_TOKEN: E2E_INBOUND_EMAIL_TOKEN,
      NEXT_PUBLIC_GOOGLE_ADS_ID: E2E_GOOGLE_ADS_ID,
      NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL: "e2eLead",
      NEXT_PUBLIC_META_PIXEL_ID: E2E_META_PIXEL_ID,
      // Il banner provato da e2e/consent.spec.ts è il nostro: niente iubenda anche se è in .env.local.
      NEXT_PUBLIC_IUBENDA_SITE_ID: "",
      NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID: "",
    },
    timeout: 180_000,
  },
});
