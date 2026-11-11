import { expect, test } from "@playwright/test";

test("il filtro Zona propone tutti i comuni e le province del Veneto e filtra per provincia", async ({ page }) => {
  await page.goto("/trova-professionista");
  await expect(page.locator("#comuni-filtro option")).toHaveCount(560 + 7);
  await expect(page.locator('#comuni-filtro option[value="Provincia di Belluno"]')).toHaveCount(1);
  await expect(page.locator(`#comuni-filtro option[value="Cortina d'Ampezzo"]`)).toHaveCount(1);

  await page.getByLabel("Zona").fill("Provincia di Padova");
  await page.getByRole("button", { name: "Applica" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("in provincia di Padova");
  await expect(page.getByLabel("Zona")).toHaveValue("Provincia di Padova");
});
