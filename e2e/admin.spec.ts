import { expect, test, type Page } from "@playwright/test";
import { E2E_INBOUND_EMAIL_TOKEN } from "../playwright.config";

/*
 * Gestionale (/admin). Questo file gira per primo sullo stesso database degli altri test:
 * non tocca il piano di Rossi Impianti né il partner usato da lead-request.spec.ts.
 */

const ADMIN = "admin@gecoitalia.it";
const PARTNER = "mario@rossiimpianti.it";

async function login(page: Page, email: string) {
  if (email === ADMIN) {
    // Il gestionale ha una pagina di accesso sua.
    await page.goto("/admin/accedi");
    await page.getByRole("textbox", { name: /^Email/ }).fill(email);
    await page.getByLabel(/^Password/).fill("geco-demo-2026");
    await page.getByRole("button", { name: "Entra nel gestionale" }).click();
    await page.waitForURL(/\/admin$/);
    return;
  }
  // I partner entrano dall'accesso aziende.
  await page.goto("/accedi/azienda");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill("geco-demo-2026");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/accedi"));
}

test("il gestionale è riservato agli amministratori", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/accedi$/);
  await expect(page.getByRole("heading", { level: 1, name: "Gestionale GecoItalia" })).toBeVisible();

  await login(page, PARTNER);
  await expect(page).toHaveURL(/\/area-partner$/);
  await page.goto("/admin/assistenza");
  await expect(page.getByRole("heading", { level: 1, name: "Questa pagina non c'è" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Gestionale" })).toHaveCount(0);

  // Dalla pagina di accesso del gestionale il partner può solo uscire e cambiare account.
  await page.goto("/admin/accedi");
  await expect(page.getByText("questo account non ha accesso al gestionale")).toBeVisible();
  await page.getByRole("button", { name: "Esci e cambia account" }).click();
  await expect(page.getByRole("button", { name: "Entra nel gestionale" })).toBeVisible();
});

test("il gestionale si installa come app e ha un'uscita sua", async ({ page, request }) => {
  const manifest = await (await request.get("/gestionale/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ start_url: "/admin", scope: "/admin", display: "standalone" });
  expect((await request.get(manifest.icons[1].src)).status()).toBe(200);

  await login(page, ADMIN);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/gestionale/manifest.webmanifest");
  await page.getByRole("button", { name: "Esci" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/admin\/accedi$/);
});

test("l'amministratore risponde e il partner legge la risposta nell'Area Partner, senza le note interne", async ({ browser }) => {
  const admin = await browser.newPage();
  await login(admin, ADMIN);
  await expect(admin).toHaveURL(/\/admin$/);
  await expect(admin.getByRole("heading", { level: 1, name: "Ciao, Team" })).toBeVisible();

  await admin.getByRole("navigation", { name: "Gestionale" }).getByRole("link", { name: /Assistenza/ }).click();
  await admin.getByRole("link", { name: /#1 · Fattura di ottobre/ }).click();
  await expect(admin.getByText("Ha scritto dal suo account: identità verificata.")).toBeVisible();
  await admin.getByLabel("Nota interna").fill("Verificare l'invio automatico delle fatture");
  await admin.getByRole("button", { name: "Salva nota" }).click();
  await expect(admin.getByRole("status").filter({ hasText: "Nota salvata" })).toBeVisible();
  await admin.getByLabel("Risposta a Mario Rossi").fill("Ciao Mario, la fattura è in Abbonamento, sotto Fatture.");
  await admin.getByRole("button", { name: "Invia risposta" }).click();
  await expect(admin.getByRole("status").filter({ hasText: "Risposta inviata" })).toBeVisible();
  await expect(admin.getByText("In attesa del cliente").first()).toBeVisible();

  const partner = await browser.newPage();
  await login(partner, PARTNER);
  await partner.goto("/area-partner/assistenza");
  await partner.getByRole("link", { name: /#1 · Fattura di ottobre/ }).click();
  await expect(partner.getByText("Ciao Mario, la fattura è in Abbonamento, sotto Fatture.")).toBeVisible();
  await expect(partner.getByText("Verificare l'invio automatico delle fatture")).toHaveCount(0);
  // Next tiene in pagina, nascosto, anche l'elenco appena lasciato: si guarda solo quello visibile.
  await expect(partner.getByText("Ti abbiamo risposto").filter({ visible: true })).toBeVisible();

  await partner.getByLabel("Rispondi").fill("Trovata, grazie!");
  await partner.getByRole("button", { name: "Invia" }).click();
  await expect(partner.getByText("Trovata, grazie!")).toBeVisible();

  await admin.reload();
  await expect(admin.getByText("Trovata, grazie!")).toBeVisible();
});

test("il partner apre una richiesta dall'Area Partner e la ritrova nel gestionale", async ({ browser }) => {
  const partner = await browser.newPage();
  await login(partner, PARTNER);
  await partner.goto("/area-partner/assistenza");
  await partner.getByLabel("Argomento").selectOption("leads");
  await partner.getByLabel("Oggetto").fill("Lead fuori zona");
  await partner.getByLabel("Messaggio").fill("Mi arrivano richieste da Rovigo ma lavoro solo a Padova.");
  await partner.getByRole("button", { name: "Invia all'assistenza" }).click();
  await expect(partner).toHaveURL(/\/area-partner\/assistenza\/\d+$/);
  await expect(partner.getByRole("heading", { level: 1, name: /Lead fuori zona/ })).toBeVisible();

  const admin = await browser.newPage();
  await login(admin, ADMIN);
  await admin.goto("/admin/assistenza?stato=open");
  await admin.getByRole("link", { name: /Lead fuori zona/ }).click();
  await expect(admin.getByRole("heading", { level: 1, name: /Lead fuori zona/ }).filter({ visible: true })).toBeVisible();
  await expect(admin.getByRole("link", { name: "Rossi Impianti" }).filter({ visible: true })).toBeVisible();
});

test("una richiesta dal sito e la risposta per email finiscono nello stesso ticket", async ({ page, request }) => {
  await page.goto("/assistenza");
  await page.getByLabel(/^Nome e cognome/).fill("Anna Neri");
  await page.getByRole("textbox", { name: /^Email/ }).fill("anna.neri@example.com");
  await page.getByLabel(/^Argomento/).selectOption("account");
  await page.getByLabel(/^Oggetto/).fill("Non ricevo l'email di conferma");
  await page.getByLabel(/^Messaggio/).fill("Mi sono registrata ieri ma l'email di conferma non arriva.");
  await page.getByRole("button", { name: "Invia la richiesta" }).click();
  const confirmation = page.getByText(/Richiesta #\d+ inviata/);
  await expect(confirmation).toBeVisible({ timeout: 15_000 });
  const number = Number(/#(\d+)/.exec((await confirmation.textContent()) ?? "")![1]);

  const inbound = (data: object, token = E2E_INBOUND_EMAIL_TOKEN) => request.post(`/api/assistenza/email?token=${token}`, { data });
  expect((await inbound({ from: "anna.neri@example.com", subject: "x", text: "x" }, "sbagliato")).status()).toBe(401);

  const reply = {
    from: "Anna Neri <anna.neri@example.com>",
    subject: `Re: Non ricevo l'email di conferma [geco #${number}]`,
    text: "Ho guardato anche nello spam.\n\nIl giorno gio 30 ott 2026 alle 10:00 geco <assistenza@gecoitalia.it> ha scritto:\n> Abbiamo ricevuto la tua richiesta",
    message_id: `<anna-${number}@example.com>`,
  };
  expect(await (await inbound(reply)).json()).toEqual({ ticket: number, created: false });
  // La stessa email consegnata due volte non si duplica; un altro mittente con lo stesso numero apre un ticket suo.
  expect(await (await inbound(reply)).json()).toEqual({ ticket: number, created: false });
  const other = await (await inbound({ from: "altro@example.com", subject: `Re: [geco #${number}]`, text: "Ciao" })).json();
  expect(other.created).toBe(true);

  await login(page, ADMIN);
  await page.goto(`/admin/assistenza/${number}`);
  await expect(page.getByText("Ho guardato anche nello spam.")).toHaveCount(1);
  await expect(page.getByText("Abbiamo ricevuto la tua richiesta")).toHaveCount(0);
  await expect(page.getByText(/Mittente non verificato/)).toBeVisible();
});

test("lead segnalato: il partner segnala e l'amministratore accoglie", async ({ browser }) => {
  const partner = await browser.newPage();
  await login(partner, PARTNER);
  await partner.goto("/area-partner/lead");
  await partner.getByRole("link", { name: /Paola R\./ }).click();
  await partner.getByLabel("Motivo").selectOption("unreachable");
  await partner.getByRole("button", { name: "Segnala richiesta non valida" }).click();
  await expect(partner.getByText("Segnalato (Numero inesistente o irraggiungibile): in verifica")).toBeVisible();

  const admin = await browser.newPage();
  await login(admin, ADMIN);
  // Dal 27/11/2026 le segnalazioni stanno in Richieste clienti: il vecchio indirizzo ci rimanda.
  await admin.goto("/admin/segnalazioni");
  await expect(admin).toHaveURL(/\/admin\/richieste\?filtro=segnalate/);
  const row = admin.getByRole("listitem").filter({ hasText: "Paola R." });
  await expect(row.getByText("Numero inesistente o irraggiungibile")).toBeVisible();
  admin.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Accogli e restituisci" }).click();
  await expect(row.getByText("Accolta")).toBeVisible();

  await partner.reload();
  await expect(partner.getByText(/: accolto\.$/)).toBeVisible();
});

test("l'amministratore sospende e riattiva un partner", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/partner?q=Mazzon");
  await page.getByRole("link", { name: /Pittura Mazzon/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pittura Mazzon" })).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Sospendi il partner" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Partner sospeso" })).toBeVisible();
  await expect(page.getByText("Sospeso", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Riattiva il partner" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Partner riattivato" })).toBeVisible();
  await page.goto("/admin/registro?q=partner.");
  await expect(page.getByRole("cell", { name: /Partner sospeso/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Partner riattivato/ })).toBeVisible();
});

test("dal menu l'amministratore vede richieste, abbonamenti e sponsorizzazioni", async ({ page }) => {
  await login(page, ADMIN);
  const nav = page.getByRole("navigation", { name: "Gestionale" });

  await nav.getByRole("link", { name: "Richieste clienti" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Richieste dei clienti" })).toBeVisible();
  await expect(page.getByText("Consegnata").first()).toBeVisible();
  await page.getByRole("link", { name: /^Codice non confermato/ }).click();
  await expect(page).toHaveURL(/filtro=da-confermare/);

  // Abbonamenti e Sponsorizzazioni sono schede della voce Aziende (menu a 5 voci, 27/11/2026).
  await nav.getByRole("link", { name: "Aziende" }).click();
  const tabs = page.getByRole("navigation", { name: "Sezione" });
  await tabs.getByRole("link", { name: "Abbonamenti" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Abbonamenti" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Rossi Impianti" })).toBeVisible();

  await tabs.getByRole("link", { name: "Sponsorizzazioni" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sponsorizzazioni" })).toBeVisible();
  await page.getByRole("link", { name: "Finite negli ultimi 90 giorni" }).click();
  await expect(page).toHaveURL(/filtro=finite/);
});
