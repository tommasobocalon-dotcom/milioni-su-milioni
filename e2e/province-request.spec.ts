import { expect, test } from "@playwright/test";

/*
 * Mappa delle province in Home (23/11/2026): si cerca solo in provincia di Treviso; le altre province restano
 * cliccabili e aprono "Inoltra una richiesta", che il gestionale conta per provincia (Nuove province).
 */

const section = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Professionisti fidati, vicino a te" });

test("Treviso porta alla ricerca, le altre province chiedono di inoltrare una richiesta", async ({ page }) => {
  await page.goto("/");
  const province = section(page);
  await expect(province.getByRole("button", { name: /Inoltra una richiesta/ })).toHaveCount(6);
  await expect(province.getByRole("link", { name: /Treviso/ })).toHaveAttribute("href", "/trova-professionista?dove=Treviso");

  await province.getByRole("button", { name: /^Verona/ }).click();
  const dialog = page.getByRole("dialog", { name: "Non siamo ancora in provincia di Verona" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(province.getByRole("button", { name: /^Verona/ })).toBeFocused();

  await province.getByRole("link", { name: /Treviso/ }).click();
  await expect(page).toHaveURL(/\/trova-professionista\?dove=Treviso$/);
});

test("la richiesta per una provincia nuova arriva nel gestionale", async ({ page, browser }) => {
  const email = `provincia-${Date.now()}@example.com`;
  await page.goto("/");
  await section(page).getByRole("button", { name: /^Padova/ }).click();
  const dialog = page.getByRole("dialog", { name: "Non siamo ancora in provincia di Padova" });

  await dialog.getByRole("button", { name: "Inoltra la richiesta" }).click();
  await expect(dialog.getByText("Scegli cosa cerchi")).toBeVisible();

  await dialog.getByRole("radio", { name: "Un'agenzia immobiliare" }).check();
  await dialog.getByLabel("Comune").fill("Castelfranco Veneto");
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByRole("button", { name: "Inoltra la richiesta" }).click();
  await expect(dialog.getByText("Castelfranco Veneto è in provincia di Treviso")).toBeVisible();

  await dialog.getByLabel("Comune").fill("Abano Terme");
  await dialog.getByLabel("Che lavoro devi fare?").fill("Vendere un appartamento");
  await dialog.getByRole("button", { name: "Inoltra la richiesta" }).click();
  await expect(dialog.getByRole("status")).toContainText(`Ti scriviamo a ${email} quando arriviamo in provincia di Padova.`);
  await dialog.getByRole("button", { name: "Chiudi" }).last().click();
  await expect(dialog).toBeHidden();

  // Nel gestionale: conteggio per provincia ed elenco con comune, cosa cerca ed email.
  const admin = await browser.newPage();
  await admin.goto("/admin/accedi");
  await admin.getByRole("textbox", { name: /^Email/ }).fill("admin@gecoitalia.it");
  await admin.getByLabel(/^Password/).fill("geco-demo-2026");
  await admin.getByRole("button", { name: "Entra nel gestionale" }).click();
  await admin.waitForURL(/\/admin$/);
  await admin.getByRole("navigation", { name: "Gestionale" }).getByRole("link", { name: "Nuove province" }).click();
  await expect(admin.getByRole("heading", { level: 1, name: "Nuove province" })).toBeVisible();
  const padova = admin.getByRole("region", { name: "Richieste per provincia" }).getByRole("row", { name: /^Padova/ });
  await expect(padova.getByRole("cell").first()).not.toHaveText("0");

  await admin.getByRole("link", { name: /^Padova \(\d+\)$/ }).click();
  await expect(admin.getByRole("heading", { name: "Richieste da Padova" })).toBeVisible();
  const row = admin.getByRole("region", { name: "Elenco delle richieste" }).getByRole("row", { name: new RegExp(email) });
  await expect(row).toContainText("Abano Terme");
  await expect(row).toContainText("Agenzia");
  await expect(row).toContainText("Vendere un appartamento");
  await admin.close();
});
