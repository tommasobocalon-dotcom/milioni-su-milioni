import { expect, type Browser } from "@playwright/test";

/**
 * Apre o chiude una provincia dal gestionale → Zone (colonna provinces.is_open, dal 26/11/2026): passando dal
 * gestionale si svuota anche la cache delle pagine, come in produzione. Finestra a sé, come verifyPartner.
 */
export async function setProvinceOpen(browser: Browser, name: string, open: boolean) {
  const admin = await browser.newPage();
  await admin.goto("/admin/accedi");
  await admin.getByRole("textbox", { name: /^Email/ }).fill("admin@gecoitalia.it");
  await admin.getByLabel(/^Password/).fill("geco-demo-2026");
  await admin.getByRole("button", { name: "Entra nel gestionale" }).click();
  await admin.waitForURL(/\/admin$/);
  await admin.goto("/admin/zone");
  // Il pulsante è una server action: si preme a pagina pronta.
  await admin.waitForLoadState("networkidle");
  const [verb, other] = open ? ["Apri", "Chiudi"] : ["Chiudi", "Apri"];
  const button = admin.getByRole("button", { name: `${verb} la provincia di ${name}` });
  if (await button.isVisible()) await button.click();
  await expect(admin.getByRole("button", { name: `${other} la provincia di ${name}` })).toBeVisible();
  await admin.close();
}
