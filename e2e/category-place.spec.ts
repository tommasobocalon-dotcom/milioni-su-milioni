import { expect, test } from "@playwright/test";

/**
 * Pagine "categoria × comune" per i motori di ricerca (PRD §15): /idraulico/padova mostra gli idraulici che lavorano
 * a Padova, con titolo e indirizzo canonico propri. Esistono solo dove c'è almeno un'azienda e sono nella sitemap.
 */

test("/idraulico/padova elenca gli idraulici di Padova con titolo e indirizzo canonico", async ({ page }) => {
  await page.goto("/idraulico/padova");
  await expect(page.getByRole("heading", { level: 1, name: "Idraulici a Padova" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rossi Impianti" }).first()).toBeVisible();
  await expect(page).toHaveTitle(/^Idraulici a Padova · GecoItalia$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/idraulico\/padova$/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Padova/);
});

test("le agenzie hanno la loro pagina per comune", async ({ page }) => {
  await page.goto("/agenzia-immobiliare/padova");
  await expect(page.getByRole("heading", { level: 1, name: "Agenzie immobiliari a Padova" })).toBeVisible();
});

test("categoria o comune inesistenti, o nessuna azienda in zona, danno la pagina 404", async ({ page }) => {
  for (const path of ["/idraulico/comune-che-non-esiste", "/mestiere-inventato/padova", "/giardiniere/padova", "/idraulico/pad"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(/ a /);
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});

test("la sitemap contiene le pagine con aziende e non quelle vuote", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toMatch(/\/idraulico\/padova<\/loc>/);
  expect(xml).not.toMatch(/\/giardiniere\//);
});
