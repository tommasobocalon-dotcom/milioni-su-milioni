import { expect, test } from "@playwright/test";

test("conferma email e recupero password con i link monouso", async ({ page }) => {
  const email = `recupero-${Date.now()}@example.com`;

  // Registrazione: nell'area cliente compare l'avviso finché l'email non è confermata.
  await page.goto("/accedi");
  await page.getByRole("button", { name: "Crea account" }).click();
  await page.getByLabel(/^Nome e cognome/).fill("Paola Neri");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill("password iniziale 1");
  await page.getByRole("button", { name: "Crea il tuo account" }).click();
  await expect(page).toHaveURL(/\/area-cliente$/);
  await expect(page.getByText(/Conferma la tua email/)).toBeVisible();

  await page.getByRole("button", { name: "Rimanda il link" }).click();
  await page.getByRole("link", { name: "Aprilo (ambiente di prova)" }).click();
  await expect(page).toHaveURL(/\/area-cliente$/);
  await expect(page.getByText(/Conferma la tua email/)).toHaveCount(0);

  // Password dimenticata: il link porta alla nuova password e fa entrare.
  await page.context().clearCookies();
  await page.goto("/accedi");
  await page.getByRole("link", { name: "Password dimenticata?" }).click();
  await expect(page).toHaveURL(/\/accedi\/password$/);
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByRole("button", { name: "Mandami il link" }).click();
  await expect(page.getByText(/tra poco ti arriva un'email/)).toBeVisible();
  const link = await page.getByRole("link", { name: "Apri il link" }).getAttribute("href");
  expect(link).toContain("/accedi/nuova-password?token=");
  await page.goto(link!);
  await page.getByLabel(/^Nuova password/).fill("password nuova 2");
  await page.getByRole("button", { name: "Salva e accedi" }).click();
  await expect(page).toHaveURL(/\/area-cliente$/);

  // Il link vale una volta sola.
  await page.goto(link!);
  await expect(page.getByText("Questo link è scaduto o è già stato usato.", { exact: false })).toBeVisible();

  // La vecchia password non vale più, la nuova sì.
  await page.context().clearCookies();
  await page.goto("/accedi");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill("password iniziale 1");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page.getByText("Email o password non corretti")).toBeVisible();
  await page.getByLabel(/^Password/).fill("password nuova 2");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/area-cliente$/);
});

test("password dimenticata dall'accesso aziende: la nuova password riporta all'area aziende", async ({ page }) => {
  const email = `recupero-azienda-${Date.now()}@example.com`;
  await page.goto("/accedi/azienda");
  await page.getByRole("button", { name: "Registra l'attività" }).click();
  await page.getByLabel(/^Nome e cognome/).fill("Luca Verdi");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill("password iniziale 1");
  await page.getByRole("button", { name: "Continua con i dati dell'attività" }).click();
  await expect(page).toHaveURL(/\/registrazione-partner$/);

  await page.context().clearCookies();
  await page.goto("/accedi/azienda");
  await page.getByRole("link", { name: "Password dimenticata?" }).click();
  await expect(page).toHaveURL(/\/accedi\/password\?per=azienda$/);
  await expect(page.getByRole("link", { name: "Torna all'accesso" })).toHaveAttribute("href", "/accedi/azienda");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByRole("button", { name: "Mandami il link" }).click();
  const link = await page.getByRole("link", { name: "Apri il link" }).getAttribute("href");
  expect(link).toMatch(/\/accedi\/nuova-password\?token=.+&per=azienda$/);
  await page.goto(link!);
  await page.getByLabel(/^Nuova password/).fill("password nuova 2");
  await page.getByRole("button", { name: "Salva e accedi" }).click();
  // Account senza attività: l'accesso aziende porta a completare la registrazione partner.
  await expect(page).toHaveURL(/\/registrazione-partner$/);
});

test("password dimenticata con un'email non iscritta: stessa risposta, nessun link", async ({ page }) => {
  await page.goto("/accedi/password");
  await page.getByRole("textbox", { name: /^Email/ }).fill(`nessuno-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Mandami il link" }).click();
  await expect(page.getByText(/tra poco ti arriva un'email/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Apri il link" })).toHaveCount(0);
});
