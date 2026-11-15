import { expect, test } from "@playwright/test";

// Telefono ed email diversi a ogni esecuzione, altrimenti la regola anti-duplicati (30 giorni) scatta.
const phone = () => `347 ${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;
const email = () => `prova.e2e+${Date.now()}@example.com`;

test("un cliente invia una richiesta verificata con OTP a un idraulico", async ({ page }) => {
  await page.goto("/professionisti/padova/idraulico/rossi-impianti");
  await expect(page.getByRole("heading", { level: 1, name: "Rossi Impianti" })).toBeVisible();
  await page.getByRole("link", { name: "Richiedi contatto" }).first().click();

  // 1. Tipo di richiesta
  await expect(page.getByRole("heading", { name: "Che lavoro ti serve?" })).toBeVisible();
  await page.getByLabel("Rifacimento bagno completo").check();
  await page.getByRole("button", { name: "Continua" }).click();

  // 2. Dettagli
  await page.getByLabel("Tipo di immobile").selectOption("Appartamento");
  await page.getByLabel("Metri quadri interessati").fill("8");
  await page.getByLabel("Descrivi il lavoro").fill("Vasca da sostituire con doccia filo pavimento.");
  await page.getByRole("button", { name: "Continua" }).click();

  // 3. Luogo e tempi: "Mestre" è una frazione di Venezia
  await page.getByLabel("Comune dell'intervento").fill("Mestre");
  await page.getByLabel("Entro 3 mesi").check();
  await page.getByLabel("18:00 – 20:00").check();
  await page.getByRole("button", { name: "Continua" }).click();

  // 4. Contatti
  await page.getByLabel("Nome e cognome").fill("Prova Automatica");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email());
  await page.getByLabel("Telefono").fill(phone());
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Invia e verifica" }).click();

  // 5. Verifica: in sviluppo il codice è mostrato a schermo
  await expect(page.getByRole("heading", { name: "Conferma la tua email" })).toBeVisible();
  const code = await page.getByText(/Il codice è/).locator("strong").innerText();
  await page.getByLabel("Codice ricevuto via email").fill(code);
  await page.getByRole("button", { name: "Conferma la richiesta" }).click();

  await expect(page).toHaveURL(/\/richiesta\/inviata\//);
  await expect(page.getByRole("heading", { name: "Richiesta inviata!" })).toBeVisible();
  await expect(page.getByText(/Rossi Impianti ha ricevuto la tua richiesta/)).toBeVisible();
});

test("un codice sbagliato non conferma la richiesta", async ({ page }) => {
  await page.goto("/richiesta/elettro-zanon");
  await page.getByLabel("Pronto intervento").check();
  await page.getByRole("button", { name: "Continua" }).click();
  await page.getByLabel("Tipo di immobile").selectOption("Appartamento");
  await page.getByRole("button", { name: "Continua" }).click();
  await page.getByLabel("Comune dell'intervento").fill("Padova");
  await page.getByLabel("Il prima possibile").check();
  await page.getByLabel("Qualsiasi orario").check();
  await page.getByRole("button", { name: "Continua" }).click();
  await page.getByLabel("Nome e cognome").fill("Prova Codice Errato");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email());
  await page.getByLabel("Telefono").fill(phone());
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Invia e verifica" }).click();

  const code = await page.getByText(/Il codice è/).locator("strong").innerText();
  const wrong = code === "000000" ? "111111" : "000000";
  await page.getByLabel("Codice ricevuto via email").fill(wrong);
  await page.getByRole("button", { name: "Conferma la richiesta" }).click();
  await expect(page.getByText(/Codice non corretto/)).toBeVisible();
  await expect(page).toHaveURL(/\/richiesta\/elettro-zanon$/);
});
