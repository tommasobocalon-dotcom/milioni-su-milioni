import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/accedi");
  await page.getByRole("textbox", { name: /^Email/ }).fill("mario@rossiimpianti.it");
  await page.getByRole("button", { name: "Inviami il codice" }).click();
  const code = await page.getByText(/Il codice è/).locator("strong").innerText();
  await page.getByLabel("Codice di accesso").fill(code);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/area-partner$/);
}

test("senza accesso l'Area Partner rimanda al login", async ({ page }) => {
  await page.goto("/area-partner/lead");
  await expect(page).toHaveURL(/\/accedi/);
});

test("un codice sbagliato non fa entrare", async ({ page }) => {
  await page.goto("/accedi");
  await page.getByRole("textbox", { name: /^Email/ }).fill("mario@rossiimpianti.it");
  await page.getByRole("button", { name: "Inviami il codice" }).click();
  const code = await page.getByText(/Il codice è/).locator("strong").innerText();
  await page.getByLabel("Codice di accesso").fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page.getByText("Codice non corretto")).toBeVisible();
});

test("il partner entra, gestisce un lead e sblocca quello oltre quota", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { level: 1, name: /, Mario$/ })).toBeVisible();
  // 18 lead nei dati di esempio, più quelli eventualmente inviati dagli altri test
  await expect(page.getByText(/^\d+ \/ 25$/).first()).toBeVisible();
  await expect(page.getByText("140").first()).toBeVisible();

  // Inbox e dettaglio di un lead
  await page.getByRole("navigation", { name: "Area Partner" }).getByRole("link", { name: "Lead" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Lead" })).toBeVisible();
  await page.getByRole("link", { name: /Marco B\./ }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Marco B\. · Rifacimento bagno completo/ })).toBeVisible();
  await expect(page.getByText("+39 347 555 1218")).toBeVisible();

  await page.getByLabel("Stato").selectOption("contacted");
  await page.getByRole("button", { name: "Aggiorna stato" }).click();
  await expect(page.getByText('Stato cambiato in "Contattato"')).toBeVisible();

  // Lead oltre quota: contatti nascosti finché non si usano i token
  await page.goto("/area-partner/lead");
  await page.getByRole("link", { name: /Chiara/ }).click();
  await expect(page.getByText("Telefono ed email nascosti")).toBeVisible();
  await page.getByRole("button", { name: "Sblocca con 8 token" }).click();
  await expect(page.getByText("+39 340 555 6677")).toBeVisible();

  await page.goto("/area-partner/token");
  await expect(page.getByText("132").first()).toBeVisible();
  await expect(page.getByRole("cell", { name: /Sblocco lead/ })).toBeVisible();
});
