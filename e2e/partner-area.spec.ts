import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/accedi/azienda");
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

test("l'accesso aziende è solo con email e password, senza Google e Apple", async ({ page }) => {
  await page.goto("/accedi/azienda");
  await expect(page.getByRole("heading", { level: 1, name: "Area aziende" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continua con Google" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Continua con Apple" })).toHaveCount(0);
  // Un vecchio link Google "per le aziende" torna all'accesso aziende senza passare da Google.
  await page.goto("/auth/google?per=azienda");
  await expect(page).toHaveURL(/\/accedi\/azienda$/);
});

test("il partner entra e gestisce le richieste", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { level: 1, name: /, Mario$/ })).toBeVisible();
  // 18 lead nei dati di esempio, più quelli eventualmente inviati dagli altri test
  await expect(page.getByRole("region", { name: "Il tuo piano" }).getByText("Normal", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Il tuo piano" }).getByText("Logo in Home")).toBeVisible();

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
  // L'accesso clienti non apre l'Area Partner: serve il login aziende.
  await page.goto("/area-partner");
  await expect(page).toHaveURL(/\/accedi\/azienda$/);
});

test("accesso aziende e accesso clienti sono separati", async ({ page }) => {
  await login(page);
  // Entrato come azienda, l'Area cliente chiede comunque il login clienti.
  await page.goto("/area-cliente");
  await expect(page).toHaveURL(/\/accedi$/);
  await expect(page.getByRole("heading", { level: 1, name: "Bentornato su GecoItalia" })).toBeVisible();
  // Stesse credenziali dall'accesso clienti: si entra nell'Area cliente, non nell'Area Partner.
  // Pagina ricaricata per intero: dopo il redirect il modulo può non essere ancora pronto a ricevere il testo.
  await page.goto("/accedi");
  await page.getByRole("textbox", { name: /^Email/ }).fill("mario@rossiimpianti.it");
  await page.getByLabel(/^Password/).fill("geco-demo-2026");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/area-cliente$/);
  // Le due sessioni restano attive: "Area aziende" porta dritto all'Area Partner.
  await page.goto("/accedi/azienda");
  await expect(page).toHaveURL(/\/area-partner$/);
  // Uscire dall'Area Partner non chiude la sessione clienti.
  // Nel menu ci sono due "Esci": quello del telefono (prima) e quello del computer (ultimo), che è la vista dei test.
  await page.getByRole("complementary").getByRole("button", { name: "Esci" }).last().click();
  await expect(page).toHaveURL(/\/accedi\/azienda$/);
  await page.goto("/area-cliente");
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

  // Profilo: dalla vista si passa alla modifica; un file che non è un'immagine viene rifiutato, logo, foto, dati aziendali e sede vengono salvati.
  await page.getByRole("link", { name: "Profilo", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Profilo" })).toBeVisible();
  await page.getByRole("link", { name: "Modifica profilo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Modifica profilo" })).toBeVisible();
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
  await page.getByLabel(/^Specializzazioni/).fill("caldaie, bagni, Caldaie");
  await page.getByLabel(/^Orari/).fill("Lun–Ven 8–18");
  await page.getByRole("button", { name: "Salva il profilo" }).click();
  await expect(page.getByText("Scrivi gli orari come «Lun–Ven: 8:00–18:00» (riga 1)")).toBeVisible();
  await page.getByLabel(/^Orari/).fill("Lun–Ven: 8:00–18:00\nSabato: su appuntamento");
  await page.getByRole("button", { name: "Salva il profilo" }).click();
  await expect(page.getByText("Profilo aggiornato")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/^Partita IVA/)).toHaveValue("01234567890");
  await expect(page.getByLabel(/^Sede legale/)).toHaveValue("Via Piave 12, 30171 Venezia (VE)");
  await expect(page.locator('img[src*="avatars"]')).toBeVisible();
  await expect(page.locator('img[src*="uploads%2Fpartners"]').first()).toBeVisible();
  await page.getByRole("link", { name: "Torna al profilo" }).click();
  // La pagina di modifica resta nel DOM nascosta (Activity di Next): si guarda dentro le sezioni della vista.
  await expect(page.getByRole("region", { name: "Azienda" }).getByText("Via Piave 12, 30171 Venezia (VE)")).toBeVisible();
  const presentation = page.getByRole("region", { name: "Presentazione" });
  await expect(presentation.getByText("Sabato: su appuntamento")).toBeVisible();
  await expect(presentation.getByText("caldaie", { exact: true })).toBeVisible();
  await expect(presentation.getByText("Caldaie", { exact: true })).toHaveCount(0);

  // Boost nella ricerca a pacchetto (senza Stripe nei test: acquisto simulato), poi visibile nelle statistiche.
  await page.goto("/area-partner/sponsorizzazioni");
  const boost = page.locator("#boost");
  await boost.getByRole("button", { name: "Simula" }).first().click();
  await expect(boost.getByText(/Attivo fino al/)).toBeVisible();
  await page.goto("/area-partner/statistiche");
  // L'etichetta c'è anche nel percorso "Dalla ricerca alla richiesta": si controlla il riquadro degli indicatori.
  await expect(page.getByRole("region", { name: "Indicatori" }).getByText("Comparse nei risultati")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Attivo" })).toBeVisible();

  // Assistenza.
  await page.getByRole("link", { name: "Aiuto" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Aiuto" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Contatti" }).getByRole("link")).toHaveCount(3);

  // Lavori e foto (voce del menu dal 13/11/2026): aggiungo un lavoro con foto, lo vedo nel profilo pubblico con i dati aziendali, lo elimino.
  await page.getByRole("link", { name: "Lavori e foto" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Lavori e foto" })).toBeVisible();
  await page.getByLabel(/^Titolo/).fill("Bagno rifatto a Mestre");
  // Un lavoro vuole da 2 a 8 foto (12/11/2026).
  await page.getByLabel(/^Foto/).setInputFiles([
    { name: "lavoro-1.png", mimeType: "image/png", buffer: png },
    { name: "lavoro-2.png", mimeType: "image/png", buffer: png },
  ]);
  await page.getByLabel(/^Descrizione/).fill("Demolizione, impianti nuovi e piatto doccia filo pavimento.");
  await page.getByRole("button", { name: "Pubblica il lavoro" }).click();
  await expect(page.getByText("Lavoro pubblicato nella tua scheda e in Ispirazione")).toBeVisible();
  const portfolio = page.getByRole("region", { name: "Elementi del portfolio" });
  await expect(portfolio.getByRole("img", { name: "Bagno rifatto a Mestre" })).toBeVisible();
  await page.getByRole("link", { name: /Vedi la scheda pubblica/ }).evaluate((a) => a.removeAttribute("target"));
  await page.getByRole("link", { name: /Vedi la scheda pubblica/ }).click();
  await expect(page.getByRole("img", { name: "Bagno rifatto a Mestre, foto 1 di 2" })).toBeVisible();
  await expect(page.getByText("P. IVA 01234567890")).toBeVisible();
  await expect(page.getByText("Sede legale: Via Piave 12, 30171 Venezia (VE)")).toBeVisible();
  await page.goto("/area-partner/lavori");
  await page.getByRole("button", { name: "Elimina Bagno rifatto a Mestre" }).click();
  await expect(portfolio.getByText("Bagno rifatto a Mestre")).toHaveCount(0);
});

test("pacchetti in euro: logo in Home ed estensione territoriale a un comune", async ({ page }) => {
  await login(page);

  // Logo in Home per 7 giorni: il nome compare nella fascia "Aziende in evidenza".
  await page.goto("/area-partner/sponsorizzazioni");
  const home = page.locator("#home");
  await home.getByRole("button", { name: "Simula" }).first().click();
  await expect(home.getByText(/Attivo fino al/)).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Rossi Impianti, idraulico a Padova \(sponsorizzato\)/ }).first()).toBeAttached();

  // Rossi Impianti è a Padova: a Verona compare solo dopo aver comprato l'estensione a quel comune.
  const verona = "/trova-professionista?categoria=idraulico&dove=Verona";
  await page.goto(verona);
  await expect(page.getByRole("link", { name: "Rossi Impianti" })).toHaveCount(0);
  await page.goto("/area-partner/sponsorizzazioni");
  const extension = page.locator("#estensione");
  await extension.getByLabel("Comune").fill("Verona (VR)");
  await extension.getByRole("button", { name: "Aggiungi" }).click();
  await expect(extension.getByText("1 comune ·")).toBeVisible();
  await extension.getByRole("button", { name: "Simula" }).click();
  await expect(extension.getByText("Compari in 1 comune in più per 30 giorni")).toBeVisible();
  await expect(extension.getByRole("list", { name: "Comuni attivi" }).getByText(/Verona \(VR\)/)).toBeVisible();
  await page.goto(verona);
  await expect(page.getByRole("link", { name: "Rossi Impianti" }).first()).toBeVisible();
});

