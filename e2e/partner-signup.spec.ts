import { expect, test } from "@playwright/test";
import { verifyPartner } from "./verify-partner";

test("un'azienda si registra, la scheda resta nascosta fino all'attivazione del piano e alla verifica del team", async ({ page, request, browser }) => {
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
  await page.getByLabel(/^Accetto i termini/).check();
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

  // Prima del pagamento la scheda non è pubblica, né da sola né nei risultati di Trova professionista.
  const profile = "/professionisti/treviso/idraulico/idraulica-verdi-treviso";
  const results = "/trova-professionista?categoria=idraulico&dove=Treviso";
  expect(await (await request.get(profile)).text()).not.toContain("Idraulica Verdi");
  expect(await (await request.get(results)).text()).not.toContain("Idraulica Verdi");

  // Attivazione di prova (senza Stripe, solo in sviluppo): piano attivo e sponsorizzazioni sbloccate, ma la scheda
  // resta nascosta finché il team non verifica partita IVA e sede (chiunque potrebbe usare la partita IVA di un altro).
  await page.getByRole("button", { name: "Scegli Normal (prova senza pagare)" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Il tuo abbonamento" })).toBeVisible();
  await expect(page.getByText("89 € al mese + IVA")).toBeVisible();
  await expect(page.getByText("La tua scheda è in verifica.")).toBeVisible();
  expect(await (await request.get(profile)).text()).not.toContain("Idraulica Verdi");
  expect(await (await request.get(results)).text()).not.toContain("Idraulica Verdi");
  await page.goto("/area-partner/sponsorizzazioni");
  await expect(page.getByRole("heading", { name: "Logo in Home" })).toBeVisible();
  await expect(page.getByText("Disponibile con i piani Normal e Premium")).toHaveCount(0);

  // Il team la verifica dal gestionale: la scheda va online e l'avviso sparisce.
  await verifyPartner(browser, "Idraulica Verdi");
  await page.goto("/area-partner");
  await expect(page.getByText("La tua scheda è in verifica.")).toHaveCount(0);
  await page.goto(profile);
  await expect(page.getByRole("heading", { level: 1, name: "Idraulica Verdi" })).toBeVisible();
  await page.goto(results);
  await expect(page.getByText("Idraulica Verdi").first()).toBeVisible();

  // Chi è già partner non riparte dalla registrazione.
  await page.goto("/registrazione-partner");
  await expect(page).toHaveURL(/\/area-partner\/abbonamento$/);
});

/** Partita IVA valida (cifra di controllo giusta) e diversa a ogni giro: una partita IVA vale una sola scheda. */
function newVatNumber() {
  const digits = String(Date.now()).slice(-10).split("").map(Number);
  const sum = digits.reduce((acc, d, i) => acc + (i % 2 === 0 ? d : d * 2 > 9 ? d * 2 - 9 : d * 2), 0);
  return digits.join("") + ((10 - (sum % 10)) % 10);
}

test("un'agenzia appena registrata compare in Trova casa solo dopo l'attivazione del piano e la verifica del team", async ({ page, request, browser }) => {
  // Dal 23/11/2026 i risultati ci sono solo in provincia di Treviso (src/lib/domain/open-areas.ts).
  const results = "/trova-casa?dove=Treviso";
  await page.goto("/accedi/azienda?next=/registrazione-partner");
  await page.getByLabel(/^Nome e cognome/).fill("Paolo Neri");
  await page.getByRole("textbox", { name: /^Email/ }).fill(`nuova.agenzia.${Date.now()}@example.com`);
  await page.getByLabel(/^Password/).fill("password-di-prova-2026");
  await page.getByLabel(/^Accetto i termini/).check();
  await page.getByRole("button", { name: "Continua con i dati dell'attività" }).click();
  await expect(page).toHaveURL(/\/registrazione-partner$/);
  await page.getByLabel(/^Cosa fai/).selectOption({ label: "Agenzia immobiliare" });
  await page.getByLabel(/^Nome sulla scheda/).fill("Immobiliare Berica Prova");
  await page.getByLabel(/^Presentazione in una frase/).fill("Compravendite e affitti a Treviso e provincia");
  await page.getByLabel(/^Comune della sede/).selectOption({ label: "Treviso" });
  await page.getByLabel(/^Telefono/).fill("0444 555 123");
  await page.getByLabel(/^Indirizzo della sede/).fill("Corso Palladio 1");
  await page.getByLabel(/^Ragione sociale/).fill("Immobiliare Berica Prova S.r.l.");
  await page.getByLabel(/^Partita IVA/).fill(newVatNumber());
  await page.getByLabel(/^Codice destinatario SDI/).fill("M5UXCR1");
  await page.getByLabel(/^Accetto i termini/).check();
  await page.getByRole("button", { name: "Continua: scegli il piano" }).click();
  await expect(page).toHaveURL(/\/area-partner\/abbonamento\?benvenuto=1$/);

  // Registrata ma senza piano: non compare tra le agenzie.
  expect(await (await request.get(results)).text()).not.toContain("Immobiliare Berica Prova");

  await page.getByRole("button", { name: "Scegli Normal (prova senza pagare)" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Il tuo abbonamento" })).toBeVisible();
  // Piano attivo ma non ancora verificata: ancora fuori dai risultati.
  expect(await (await request.get(results)).text()).not.toContain("Immobiliare Berica Prova");

  await verifyPartner(browser, "Immobiliare Berica Prova");
  await page.goto(results);
  await expect(page.getByText("Immobiliare Berica Prova").first()).toBeVisible();
});
