import { expect, test } from "@playwright/test";

test("dalla barra di ricerca: accesso, transizione di benvenuto ed elenco delle aziende", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("search");
  await search.getByRole("textbox", { name: /Cosa ti serve/ }).fill("rifare il bagno");
  await search.getByRole("combobox", { name: /Dove/ }).fill("Padova");
  await search.getByRole("button", { name: "Cerca" }).click();

  // Senza account si passa dall'accesso, che sa dove riportare la persona.
  await expect(page).toHaveURL(/\/accedi\?next=/);
  await expect(page.getByRole("status").filter({ hasText: "tutte le aziende disponibili" })).toBeVisible();
  await page.getByRole("textbox", { name: /^Email/ }).fill("mario@rossiimpianti.it");
  await page.getByLabel(/^Password/).fill("geco-demo-2026");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();

  // Il sipario "gecoitalia" copre la pagina e poi si apre da solo.
  await expect(page.locator("html")).toHaveAttribute("data-benvenuto", "");
  await expect(page.locator(".benvenuto-marchio")).toHaveText("gecoitalia");
  await expect(page.locator("html")).not.toHaveAttribute("data-benvenuto", { timeout: 6000 });

  await expect(page).toHaveURL(/\/trova-professionista\?categoria=idraulico&servizio=bagno&dove=Padova$/);
  await expect(page.getByRole("heading", { level: 1, name: "Idraulici a Padova" })).toBeVisible();

  // Una pagina nuova dopo l'accesso non ripete la transizione.
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-benvenuto");
});

test("confronta prezzi: lavori di casa e prezzo al metro quadro", async ({ page }) => {
  await page.goto("/confronta-prezzi?voce=idraulico/bagno");
  await expect(page.getByRole("heading", { level: 2, name: "Rifacimento bagno completo" })).toBeVisible();
  await expect(page.getByText("Prezzo tipico", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Rossi Impianti" })).toBeVisible();
  await expect(page.getByText(/il preventivo finale dipende dal sopralluogo/)).toBeVisible();

  await page.getByRole("link", { name: "Case in vendita" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /prezzo al metro quadro/ })).toBeVisible();
  await expect(page.getByText(/non è una quotazione ufficiale/)).toBeVisible();
});

test("vicino a te: comune scritto, raggio e aziende dalla più vicina", async ({ page }) => {
  await page.goto("/vicino-a-te");
  await page.getByRole("combobox", { name: "Comune" }).fill("Mestre");
  await page.getByRole("button", { name: "Cerca" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /entro 10 km da Venezia/ })).toBeVisible();

  await page.getByRole("link", { name: "50 km" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /entro 50 km da Venezia/ })).toBeVisible();
  const first = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Richiedi contatto" }) }).first();
  await expect(first).toBeVisible();
  await expect(page.getByRole("img", { name: /Radar: \d+ aziende? entro 50 km da Venezia/ })).toBeVisible();
});
