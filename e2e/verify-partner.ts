import { expect, type Browser } from "@playwright/test";

/**
 * Il team verifica l'azienda dal gestionale ("Segna come verificato"): dal 20/11/2026 è il passo che manda online la
 * scheda di un'azienda con il piano attivo (listingStatus in src/lib/domain/billing.ts). Gira in una finestra a sé,
 * così la sessione dell'amministratore non tocca quella dell'azienda.
 */
export async function verifyPartner(browser: Browser, displayName: string) {
  const admin = await browser.newPage();
  await admin.goto("/admin/accedi");
  await admin.getByRole("textbox", { name: /^Email/ }).fill("admin@gecoitalia.it");
  await admin.getByLabel(/^Password/).fill("geco-demo-2026");
  await admin.getByRole("button", { name: "Entra nel gestionale" }).click();
  await admin.waitForURL(/\/admin$/);
  await admin.goto(`/admin/partner?q=${encodeURIComponent(displayName)}`);
  await admin.getByRole("link", { name: new RegExp(displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
  await admin.getByRole("button", { name: "Segna come verificato" }).click();
  await expect(admin.getByRole("button", { name: "Rimetti da verificare" })).toBeVisible();
  await admin.close();
}
