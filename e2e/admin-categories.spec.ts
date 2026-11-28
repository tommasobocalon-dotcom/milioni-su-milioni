import { expect, test, type Page } from "@playwright/test";

/**
 * Gestionale → Categorie (26/11/2026): il team crea una categoria, le dà un servizio del listino e una domanda del
 * modulo di richiesta, poi la elimina. Una categoria usata da aziende non si elimina.
 */

async function loginAdmin(page: Page) {
  await page.goto("/admin/accedi");
  await page.getByRole("textbox", { name: /^Email/ }).fill("admin@gecoitalia.it");
  await page.getByLabel(/^Password/).fill("geco-demo-2026");
  await page.getByRole("button", { name: "Entra nel gestionale" }).click();
  await page.waitForURL(/\/admin$/);
}

test("una categoria nuova con servizio e domanda, poi eliminata", async ({ page }) => {
  const name = `Fabbro prova ${Date.now()}`;
  await loginAdmin(page);
  await page.goto("/admin/categorie");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/^Nome \*/).fill(name);
  await page.getByLabel(/^Nome al plurale/).fill("Fabbri prova");
  await page.getByRole("button", { name: "Crea la categoria" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  await page.getByLabel(/^Nuovo servizio/).fill("Apertura porte");
  await page.getByRole("button", { name: "Aggiungi il servizio" }).click();
  await expect(page.getByText("Servizio aggiunto")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Servizi del listino (1)" })).toBeVisible();

  // Una scelta da elenco vuole almeno due opzioni; con l'errore i campi restano compilati.
  const question = page.locator("form").filter({ has: page.getByRole("button", { name: "Aggiungi la domanda" }) });
  await question.getByLabel(/^Domanda/).fill("Tipo di porta");
  await question.getByLabel(/^Tipo di risposta/).selectOption("select");
  await question.getByRole("button", { name: "Aggiungi la domanda" }).click();
  await expect(question.getByRole("alert")).toHaveText("Scrivi almeno due opzioni, una per riga");
  await expect(question.getByLabel(/^Domanda/)).toHaveValue("Tipo di porta");
  await question.getByLabel(/^Opzioni/).fill("Porta blindata\nPorta in legno");
  await question.getByRole("button", { name: "Aggiungi la domanda" }).click();
  await expect(page.getByRole("heading", { name: "Domande del modulo di richiesta (1)" })).toBeVisible();

  // Le eliminazioni chiedono conferma con il nome dell'elemento (27/11/2026).
  page.on("dialog", (d) => d.accept());
  await page.getByText("Tipo di porta", { exact: true }).click();
  await page.getByRole("button", { name: "Elimina la domanda" }).click();
  await expect(page.getByRole("heading", { name: "Domande del modulo di richiesta (0)" })).toBeVisible();

  await page.getByRole("button", { name: "Elimina la categoria" }).click();
  await expect(page).toHaveURL(/\/admin\/categorie$/);
  // Solo elementi visibili: Next tiene nascosta nel DOM la pagina della categoria appena lasciata.
  await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
});

test("una categoria con aziende non si elimina", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/categorie");
  await page.getByRole("link", { name: /^Idraulico/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Idraulico" })).toBeVisible();
  await expect(page.getByText("La categoria è usata da aziende, richieste di contatto, richieste di zona o boost. Non si può eliminare.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Elimina la categoria" })).toHaveCount(0);
});
