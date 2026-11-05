import { expect, test } from "@playwright/test";

test("un'azienda si registra, la scheda resta nascosta fino all'attivazione del piano", async ({ page, request }) => {
  const email = `nuovo.partner.${Date.now()}@example.com`;

  // Dai piani pubblici alla registrazione, poi all'account con ritorno automatico.
  await page.goto("/per-i-professionisti#piani");
  await page.getByRole("link", { name: "Scegli Normal" }).click();
  await page.getByRole("link", { name: "Crea account o accedi" }).click();
  await expect(page).toHaveURL(/\/accedi\/azienda\?next=\/registrazione-partner$/);
  await expect(page.getByRole("heading", { level: 1, name: "Registra la tua attività" })).toBeVisible();
  await page.getByLabel(/^Nome e cognome/).fill("Giulia Verdi");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill("password-di-prova-2026");
  await page.getByRole("button", { name: "Continua con i dati dell'attività" }).click();
  await expect(page).toHaveURL(/\/registrazione-partner$/);
  await expect(page.getByText(email)).toBeVisible();

  // Dati dell'attività: prima una partita IVA sbagliata, poi quella giusta.
  await page.getByLabel(/^Cosa fai/).selectOption({ label: "Idraulico" });
  await page.getByLabel(/^Nome sulla scheda/).fill("Idraulica Verdi");
  await page.getByLabel(/^Presentazione in una frase/).fill("Impianti idraulici e caldaie a Treviso e provincia");
  await page.getByLabel(/^Comune della sede/).selectOption({ label: "Treviso" });
  await page.getByLabel(/^Telefono/).fill("0422 555 123");
  await page.getByLabel(/^Indirizzo della sede/).fill("Via Roma 10");
  await page.getByLabel(/^Ragione sociale/).fill("Idraulica Verdi di Giulia Verdi");
  await page.getByLabel(/^Partita IVA/).fill("00743110158");
  await page.getByLabel(/^Codice destinatario SDI/).fill("M5UXCR1");
  await page.getByLabel(/^Accetto i termini/).check();
  await page.getByRole("button", { name: "Continua: scegli il piano" }).click();
  await expect(page.getByText("Partita IVA non valida: controlla le 11 cifre")).toBeVisible();
  await expect(page.getByLabel(/^Nome sulla scheda/)).toHaveValue("Idraulica Verdi");

  await page.getByLabel(/^Partita IVA/).fill("00743110157");
  await page.getByRole("button", { name: "Continua: scegli il piano" }).click();
  await expect(page).toHaveURL(/\/area-partner\/abbonamento\?benvenuto=1$/);
  await expect(page.getByText("Scheda creata.")).toBeVisible();

  // Prima del pagamento la scheda non è pubblica.
  const profile = "/professionisti/treviso/idraulico/idraulica-verdi-treviso";
  expect(await (await request.get(profile)).text()).not.toContain("Idraulica Verdi");

  // Attivazione di prova (senza Stripe, solo in sviluppo): piano attivo, crediti del piano, scheda pubblica.
  await page.getByRole("button", { name: "Scegli Normal (prova senza pagare)" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Il tuo abbonamento" })).toBeVisible();
  await expect(page.getByText("49 € al mese + IVA")).toBeVisible();
  await page.goto("/area-partner/token");
  await expect(page.getByText("Crediti del piano Normal (attivazione di prova)")).toBeVisible();
  await page.goto(profile);
  await expect(page.getByRole("heading", { level: 1, name: "Idraulica Verdi" })).toBeVisible();

  // Chi è già partner non riparte dalla registrazione.
  await page.goto("/registrazione-partner");
  await expect(page).toHaveURL(/\/area-partner\/abbonamento$/);
});
