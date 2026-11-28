import { expect, test } from "@playwright/test";

test("il cliente scarica i suoi dati ed elimina l'account", async ({ page }) => {
  const email = `privacy-${Date.now()}@example.com`;

  await page.goto("/accedi");
  await page.getByRole("button", { name: "Crea account" }).click();
  await page.getByLabel(/^Nome e cognome/).fill("Luca Bianchi");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill("password di prova 1");
  await page.getByLabel(/^Accetto i termini/).check();
  await page.getByRole("button", { name: "Crea il tuo account" }).click();
  await expect(page).toHaveURL(/\/area-cliente$/);

  // Scarica i dati: un file JSON con l'account.
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Scarica i dati" }).click();
  const file = await (await download).path();
  const data = JSON.parse(await (await import("node:fs/promises")).readFile(file, "utf8"));
  expect(data.account.email).toBe(email);

  // Senza la parola di conferma non elimina nulla.
  await page.getByLabel("Scrivi ELIMINA per confermare").fill("no");
  await page.getByRole("button", { name: "Elimina il mio account" }).click();
  await expect(page.getByText("Scrivi ELIMINA per confermare.")).toBeVisible();

  await page.getByLabel("Scrivi ELIMINA per confermare").fill("elimina");
  await page.getByRole("button", { name: "Elimina il mio account" }).click();
  await expect(page).toHaveURL(/\/accedi\?avviso=account-eliminato$/);
  await expect(page.getByText("Il tuo account è stato eliminato insieme ai tuoi dati.")).toBeVisible();

  // L'account non c'è più: la password non vale.
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill("password di prova 1");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page.getByText("Email o password non corretti")).toBeVisible();
});
