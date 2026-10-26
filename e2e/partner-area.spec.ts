import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/accedi");
  await page.getByRole("textbox", { name: /^Email/ }).fill("mario@rossiimpianti.it");
  await page.getByLabel(/^Password/).fill("geco-demo-2026");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/area-partner$/);
}

test("senza accesso l'Area Partner rimanda al login", async ({ page }) => {
  await page.goto("/area-partner/lead");
  await expect(page).toHaveURL(/\/accedi/);
});

test("una password sbagliata non fa entrare", async ({ page }) => {
  await page.goto("/accedi");
  await page.getByRole("textbox", { name: /^Email/ }).fill("mario@rossiimpianti.it");
  await page.getByLabel(/^Password/).fill("password-sbagliata");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page.getByText("Email o password non corretti")).toBeVisible();
  await expect(page).toHaveURL(/\/accedi$/);
});

test("Google e Apple non configurati rimandano al login con un avviso", async ({ page }) => {
  await page.goto("/accedi");
  await page.getByRole("link", { name: "Continua con Apple" }).click();
  await expect(page).toHaveURL(/\/accedi\?errore=apple-config$/);
  await expect(page.getByText("L'accesso con Apple non è ancora attivo. Usa email e password.")).toBeVisible();
});

test("Google dall'accesso aziende riporta alla pagina aziende", async ({ page }) => {
  await page.goto("/accedi/azienda");
  await page.getByRole("link", { name: "Continua con Google" }).click();
  await expect(page).toHaveURL(/\/accedi\/azienda\?errore=google-config$/);
  await expect(page.getByRole("heading", { level: 1, name: "Area aziende" })).toBeVisible();
  await expect(page.getByText("L'accesso con Google non è ancora attivo. Usa email e password.")).toBeVisible();
});

test("il partner entra, gestisce un lead e sblocca quello oltre quota", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { level: 1, name: /, Mario$/ })).toBeVisible();
  // 18 lead nei dati di esempio, più quelli eventualmente inviati dagli altri test
  await expect(page.getByText(/^\d+ \/ 25$/).first()).toBeVisible();
  await expect(page.getByText("140").first()).toBeVisible();

  // Inbox e dettaglio di un lead
  await page.getByRole("navigation", { name: "Area Partner" }).getByRole("link", { name: "Lead" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Lead" })).toBeVisible();
  await page.getByRole("link", { name: /Marco B\./ }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Marco B\. · Rifacimento bagno completo/ })).toBeVisible();
  await expect(page.getByText("+39 347 555 1218")).toBeVisible();

  await page.getByLabel("Stato").selectOption("contacted");
  await page.getByRole("button", { name: "Aggiorna stato" }).click();
  await expect(page.getByText('Stato cambiato in "Contattato"')).toBeVisible();

  // Lead oltre quota: contatti nascosti finché non si usano i token
  await page.goto("/area-partner/lead");
  await page.getByRole("link", { name: /Chiara/ }).click();
  await expect(page.getByText("Telefono ed email nascosti")).toBeVisible();
  await page.getByRole("button", { name: "Sblocca con 8 token" }).click();
  await expect(page.getByText("+39 340 555 6677")).toBeVisible();

  await page.goto("/area-partner/token");
  await expect(page.getByText("132").first()).toBeVisible();
  await expect(page.getByRole("cell", { name: /Sblocco lead/ })).toBeVisible();
});

test("chi crea un account senza azienda entra come cliente nell'Area cliente", async ({ page }) => {
  await page.goto("/accedi");
  await page.getByRole("button", { name: "Crea account" }).click();
  await page.getByLabel(/^Nome e cognome/).fill("Giulia Bianchi");
  await page.getByRole("textbox", { name: /^Email/ }).fill(`cliente-${Date.now()}@example.com`);
  await page.getByLabel(/^Password/).fill("corta");
  await page.getByRole("button", { name: "Crea il tuo account" }).click();
  await expect(page.getByText("La password deve avere almeno 8 caratteri")).toBeVisible();
  await page.getByLabel(/^Password/).fill("una password lunga");
  await page.getByRole("button", { name: "Crea il tuo account" }).click();
  await expect(page).toHaveURL(/\/area-cliente$/);
  await expect(page.getByRole("heading", { name: "Le tue richieste" })).toBeVisible();
  await page.goto("/area-partner");
  await expect(page).toHaveURL(/\/area-cliente$/);
});

test("campanella, profilo, boost, statistiche, assistenza e lavori svolti", async ({ page }) => {
  await login(page);
  const bell = page.getByRole("link", { name: /^Posta in arrivo, \d+ da leggere$/ });
  const before = Number((await bell.getAttribute("aria-label"))!.match(/\d+/)![0]);
  await bell.click();
  await expect(page.getByRole("heading", { level: 1, name: "Posta in arrivo" })).toBeVisible();
  await page.getByRole("region", { name: "Da leggere" }).getByRole("link").first().click();
  await expect(page).toHaveURL(/\/area-partner\/lead\//);
  const after = before - 1;
  await expect(page.getByRole("link", { name: after ? `Posta in arrivo, ${after} da leggere` : "Posta in arrivo" }).first()).toBeVisible();

  // Modifica account: un file che non è un'immagine viene rifiutato, logo, foto, dati aziendali e sede vengono salvati.
  await page.getByRole("link", { name: "Modifica account" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Modifica account" })).toBeVisible();
  const photo = page.getByLabel(/foto profilo/);
  await photo.setInputFiles({ name: "finto.png", mimeType: "image/png", buffer: Buffer.from("<html>no</html>") });
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(page.getByText("La foto deve essere JPG, PNG o WebP")).toBeVisible();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  await photo.setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: png });
  await page.getByLabel(/logo/).setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
  await page.getByLabel(/^Partita IVA/).fill("123");
  await page.getByRole("button", { name: "Salva il profilo" }).click();
  await expect(page.getByText("La partita IVA ha 11 cifre")).toBeVisible();
  await page.getByLabel(/^Partita IVA/).fill("IT 01234567890");
  await page.getByLabel(/^Ragione sociale/).fill("Rossi Impianti S.r.l.");
  await page.getByLabel(/^Sede legale/).fill("Via Piave 12, 30171 Venezia (VE)");
  await page.getByLabel(/Frase di presentazione/).fill("Impianti idraulici e caldaie a Mestre");
  await page.getByRole("button", { name: "Salva il profilo" }).click();
  await expect(page.getByText("Profilo aggiornato")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/^Partita IVA/)).toHaveValue("01234567890");
  await expect(page.getByLabel(/^Sede legale/)).toHaveValue("Via Piave 12, 30171 Venezia (VE)");
  await expect(page.locator('img[src*="avatars"]')).toBeVisible();
  await expect(page.locator('img[src*="uploads%2Fpartners"]').first()).toBeVisible();

  // Boost a token, poi visibile nelle statistiche.
  await page.goto("/area-partner/token");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /3 giorni · 30 token/ }).click();
  await expect(page.getByText(/Boost attivo fino al/)).toBeVisible();
  await page.goto("/area-partner/statistiche");
  await expect(page.getByText("Comparse nei risultati")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Attivo" })).toBeVisible();

  // Assistenza.
  await page.getByRole("link", { name: "Assistenza" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Assistenza" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Contatti" }).getByRole("link")).toHaveCount(3);

  // Lavori svolti (nella scheda): aggiungo un lavoro con foto, lo vedo nel profilo pubblico con i dati aziendali, lo elimino.
  await page.goto("/area-partner/scheda");
  await page.getByLabel(/^Titolo/).fill("Bagno rifatto a Mestre");
  await page.getByLabel("Foto", { exact: true }).setInputFiles({ name: "lavoro.png", mimeType: "image/png", buffer: png });
  await page.getByLabel("Descrizione").fill("Demolizione, impianti nuovi e piatto doccia filo pavimento.");
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText("Aggiunto al portfolio")).toBeVisible();
  const portfolio = page.getByRole("region", { name: "Elementi del portfolio" });
  await expect(portfolio.getByRole("img", { name: "Bagno rifatto a Mestre" })).toBeVisible();
  await page.getByRole("link", { name: /Vedi la scheda pubblica/ }).evaluate((a) => a.removeAttribute("target"));
  await page.getByRole("link", { name: /Vedi la scheda pubblica/ }).click();
  await expect(page.getByRole("img", { name: "Bagno rifatto a Mestre" })).toBeVisible();
  await expect(page.getByText("P. IVA 01234567890")).toBeVisible();
  await expect(page.getByText("Sede legale: Via Piave 12, 30171 Venezia (VE)")).toBeVisible();
  await page.goto("/area-partner/scheda");
  await page.getByRole("button", { name: "Elimina Bagno rifatto a Mestre" }).click();
  await expect(portfolio.getByText("Bagno rifatto a Mestre")).toHaveCount(0);
});
