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

test("il partner entra e gestisce le richieste", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { level: 1, name: /, Mario$/ })).toBeVisible();
  // 18 lead nei dati di esempio, più quelli eventualmente inviati dagli altri test
  await expect(page.getByRole("region", { name: "Il tuo piano" }).getByText("Normal", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Il tuo piano" }).getByText("Crediti")).toBeVisible();

  // Inbox e dettaglio di un lead
  await page.getByRole("navigation", { name: "Area Partner" }).getByRole("link", { name: "Richieste clienti" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Richieste clienti" })).toBeVisible();
  await page.getByRole("link", { name: /Marco B\./ }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Marco B\. · Rifacimento bagno completo/ })).toBeVisible();
  await expect(page.getByText("+39 347 555 1218")).toBeVisible();

  await page.getByLabel("Stato").selectOption("contacted");
  await page.getByRole("button", { name: "Aggiorna stato" }).click();
  await expect(page.getByText('Stato cambiato in "Chiamata"')).toBeVisible();

  // Le richieste sono gratis e illimitate: i contatti si vedono subito, senza sblocchi.
  await page.goto("/area-partner/lead");
  await page.getByRole("link", { name: /Chiara/ }).click();
  await expect(page.getByText("+39 340 555 6677")).toBeVisible();
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

  // Dati account: un file che non è un'immagine viene rifiutato, logo, foto, dati aziendali e sede vengono salvati.
  await page.getByRole("link", { name: "La mia attività" }).first().click();
  await page.getByRole("link", { name: "Dati account" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dati account" })).toBeVisible();
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
  await page.getByRole("button", { name: /24 ore · 50 crediti/ }).click();
  await expect(page.getByText(/In evidenza fino al/)).toBeVisible();
  await page.goto("/area-partner/statistiche");
  // L'etichetta c'è anche nel percorso "Dalla ricerca alla richiesta": si controlla il riquadro degli indicatori.
  await expect(page.getByRole("region", { name: "Indicatori" }).getByText("Comparse nei risultati")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Attivo" })).toBeVisible();

  // Assistenza.
  await page.getByRole("link", { name: "Aiuto" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Aiuto" })).toBeVisible();
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

test("extra a crediti: provincia vicina nelle ricerche e lavoro in Ispirazione", async ({ page }) => {
  await login(page);

  // Rossi Impianti è a Padova: in provincia di Verona compare solo dopo aver comprato la provincia vicina.
  const verona = "/trova-professionista?categoria=idraulico&dove=Verona";
  await page.goto(verona);
  await expect(page.getByRole("link", { name: "Rossi Impianti" })).toHaveCount(0);
  await page.goto("/area-partner/token");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Verona" }).click();
  await expect(page.getByText(/Compari anche in provincia di Verona fino al/)).toBeVisible();
  await page.goto(verona);
  await expect(page.getByRole("link", { name: "Rossi Impianti" }).first()).toBeVisible();

  // Un lavoro con foto in evidenza nella pagina Ispirazione, con la scritta "Sponsorizzato".
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  await page.goto("/area-partner/scheda");
  await page.getByLabel(/^Titolo/).fill("Caldaia nuova a Vigonza");
  await page.getByLabel("Foto", { exact: true }).setInputFiles({ name: "caldaia.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.getByText("Aggiunto al portfolio")).toBeVisible();
  await page.goto("/area-partner/token");
  await page.getByLabel("Lavoro da mettere in evidenza").selectOption({ label: "Caldaia nuova a Vigonza" });
  await page.getByRole("button", { name: /7 giorni · 80 crediti/ }).click();
  await expect(page.getByText(/In evidenza in Ispirazione fino al/)).toBeVisible();
  await page.goto("/ispirazione");
  const featured = page.getByRole("region", { name: "In evidenza" });
  await expect(featured.getByText("Caldaia nuova a Vigonza")).toBeVisible();
  await expect(featured.getByText("Sponsorizzato")).toBeVisible();

  await page.goto("/area-partner/scheda");
  await page.getByRole("button", { name: "Elimina Caldaia nuova a Vigonza" }).click();
});
