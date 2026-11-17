import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { E2E_DATABASE_URL, E2E_GOOGLE_ADS_ID } from "../playwright.config";

/**
 * Banner dei cookie (Garante, linee guida 2021): Google Ads e il pixel di Meta si caricano solo dopo "Accetta", la scelta
 * resta salvata e si cambia da "Preferenze cookie". Una richiesta inviata manda la conversione a entrambi.
 */

// Senza la scelta già salvata dalla configurazione comune: qui il banner deve comparire.
test.use({ storageState: { cookies: [], origins: [] } });

/** Blocca gli script veri di Google e Meta e ne tiene l'elenco. */
async function blockTrackers(page: Page) {
  const requested: string[] = [];
  await page.route(/googletagmanager\.com|connect\.facebook\.net/, (route) => {
    requested.push(route.request().url());
    return route.abort();
  });
  return requested;
}

test("con \"Rifiuta\" non si carica niente e il banner non torna", async ({ page }) => {
  const requested = await blockTrackers(page);
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Cookie" });
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Rifiuta" }).click();
  await expect(banner).toBeHidden();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(banner).toBeHidden();
  expect(requested).toEqual([]);
});

test("con \"Accetta\" si caricano Google e Meta, e dal footer si cambia idea", async ({ page }) => {
  const requested = await blockTrackers(page);
  await page.goto("/");
  await page.getByRole("region", { name: "Cookie" }).getByRole("button", { name: "Accetta" }).click();
  await expect.poll(() => requested.some((u) => u.includes(`gtag/js?id=${E2E_GOOGLE_ADS_ID}`))).toBe(true);
  await expect.poll(() => requested.some((u) => u.includes("fbevents.js"))).toBe(true);

  await page.getByRole("button", { name: "Preferenze cookie" }).click();
  await page.getByRole("region", { name: "Cookie" }).getByRole("button", { name: "Rifiuta" }).click();
  await page.waitForLoadState("load");
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "geco_consenso")?.value).toBe("v1%3A0");
});

test("la pagina di richiesta inviata manda la conversione a Google e a Meta", async ({ page }) => {
  const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
  const [{ id }] = await sql<{ id: string }[]>`
    select id from leads where verified_at is not null and delivered_at is not null and charge = 'quota' limit 1`;
  await sql.end();

  await blockTrackers(page);
  await page.goto("/");
  await page.getByRole("region", { name: "Cookie" }).getByRole("button", { name: "Accetta" }).click();
  await page.goto(`/richiesta/inviata/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Richiesta inviata!" })).toBeVisible();

  const sent = () =>
    page.evaluate(() => {
      const w = window as unknown as { dataLayer?: IArguments[]; fbq?: { queue: unknown[][] } };
      return {
        google: (w.dataLayer ?? []).map((a) => Array.from(a)),
        meta: w.fbq?.queue ?? [],
      };
    });
  await expect.poll(async () => (await sent()).google).toContainEqual(["event", "conversion", { send_to: `${E2E_GOOGLE_ADS_ID}/e2eLead` }]);
  await expect.poll(async () => (await sent()).meta).toContainEqual(["track", "Lead"]);
});
