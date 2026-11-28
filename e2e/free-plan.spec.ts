import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { E2E_DATABASE_URL } from "../playwright.config";
import { verifyPartner } from "./verify-partner";

/**
 * Piano gratuito di lancio (soci, 15/11/2026; dal 21/11/2026 3 richieste in tutto): l'azienda parte gratis con il Base
 * finché non riceve 3 richieste. Alla 3ª il gratuito finisce: la scheda esce dai risultati e l'Area Partner resta ferma
 * sulla pagina Abbonamento finché l'azienda non sceglie un piano.
 */

const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
test.afterAll(() => sql.end());

/** Partita IVA valida (cifra di controllo giusta) e diversa a ogni giro: una partita IVA vale una sola scheda. */
function newVatNumber() {
  const digits = String(Date.now()).slice(-10).split("").map(Number);
  const sum = digits.reduce((acc, d, i) => acc + (i % 2 === 0 ? d : d * 2 > 9 ? d * 2 - 9 : d * 2), 0);
  return digits.join("") + ((10 - (sum % 10)) % 10);
}

test("un'azienda parte gratis e alla 3ª richiesta sparisce dai risultati con l'Area Partner bloccata fino alla scelta del piano", async ({ page, browser }) => {
  const stamp = Date.now();
  const name = `Idraulica Gratis ${stamp}`;
  const clientEmail = `cliente.gratis.${stamp}@example.com`;

  await page.goto("/accedi/azienda?next=/registrazione-partner");
  await page.getByLabel(/^Nome e cognome/).fill("Sara Gratis");
  await page.getByRole("textbox", { name: /^Email/ }).fill(`partner.gratis.${stamp}@example.com`);
  await page.getByLabel(/^Password/).fill("password-di-prova-2026");
  await page.getByLabel(/^Accetto i termini/).check();
  await page.getByRole("button", { name: "Continua con i dati dell'attività" }).click();
  await expect(page).toHaveURL(/\/registrazione-partner$/);
  await page.getByLabel(/^Cosa fai/).selectOption({ label: "Idraulico" });
  await page.getByLabel(/^Nome sulla scheda/).fill(name);
  await page.getByLabel(/^Presentazione in una frase/).fill("Impianti idraulici a Treviso e provincia");
  await page.getByLabel(/^Comune della sede/).selectOption({ label: "Treviso" });
  await page.getByLabel(/^Telefono/).fill("0422 555 999");
  await page.getByLabel(/^Indirizzo della sede/).fill("Via Roma 20");
  await page.getByLabel(/^Ragione sociale/).fill(`${name} S.r.l.`);
  await page.getByLabel(/^Partita IVA/).fill(newVatNumber());
  await page.getByLabel(/^Codice destinatario SDI/).fill("M5UXCR1");
  await page.getByLabel(/^Accetto i termini/).check();
  await page.getByRole("button", { name: "Continua: scegli il piano" }).click();
  await expect(page).toHaveURL(/\/area-partner\/abbonamento\?benvenuto=1$/);

  // Parte gratis: piano attivo senza pagamento, contatore a zero. La scheda va online dopo la verifica del team.
  await page.getByRole("button", { name: "Inizia gratis" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Piano gratuito" })).toBeVisible();
  await expect(page.getByText("0 di 3")).toBeVisible();
  const [{ id: partnerId, slug }] = await sql<{ id: string; slug: string }[]>`select id, slug from partners where display_name = ${name}`;
  const [{ free }] = await sql<{ free: boolean }[]>`select free from subscriptions where partner_id = ${partnerId} and status = 'active'`;
  expect(free).toBe(true);
  await expect(page.getByText("La tua scheda è in verifica.")).toBeVisible();
  await verifyPartner(browser, name);
  const listed = await browser.newPage();
  await listed.goto("/idraulico/treviso");
  await expect(listed.getByText(name)).toBeVisible();
  await listed.close();

  // Le prime 2 richieste gratuite, già consegnate.
  const [category] = await sql<{ id: string }[]>`select category_id as id from partners where id = ${partnerId}`;
  const [place] = await sql<{ id: number }[]>`select id from municipalities where name = 'Treviso'`;
  for (let i = 0; i < 2; i++) {
    await sql`
      insert into leads (partner_id, category_id, municipality_id, request_type, timing, callback_slot, client_name, client_email, client_phone,
                         privacy_consent, charge, verified_at, delivered_at)
      values (${partnerId}, ${category.id}, ${place.id}, 'Altro lavoro', 'Entro 3 mesi', 'Qualsiasi orario', ${`Cliente ${i}`},
              ${`gia.${i}.${stamp}@example.com`}, ${`+39347000${String(stamp).slice(-4)}${i}`}, true, 'quota', now(), now())`;
  }

  // La 3ª arriva dal sito, confermata con il codice.
  const client = await browser.newPage();
  await client.goto(`/richiesta/${slug}`);
  await client.getByLabel("Altro lavoro").check();
  await client.getByRole("button", { name: "Continua" }).click();
  await client.getByLabel("Tipo di immobile").selectOption("Appartamento");
  await client.getByLabel("Descrivi il lavoro").fill("Perdita sotto il lavello, chiamatemi al 347 123 4567.");
  await client.getByRole("button", { name: "Continua" }).click();
  await client.getByLabel("Comune dell'intervento").fill("Treviso");
  await client.getByLabel("Entro 3 mesi").check();
  await client.getByLabel("Qualsiasi orario").check();
  await client.getByRole("button", { name: "Continua" }).click();
  await client.getByLabel("Nome e cognome").fill("Cliente Terzo");
  await client.getByRole("textbox", { name: /^Email/ }).fill(clientEmail);
  await client.getByLabel("Telefono").fill(`347 ${Math.floor(1_000_000 + Math.random() * 8_999_999)}`);
  await client.getByRole("checkbox").first().check();
  await client.getByRole("button", { name: "Invia e verifica" }).click();
  const code = await client.getByText(/Il codice è/).locator("strong").innerText();
  await client.getByLabel("Codice ricevuto via email").fill(code);
  await client.getByRole("button", { name: "Conferma la richiesta" }).click();
  await expect(client.getByRole("heading", { name: "Richiesta inviata!" })).toBeVisible();
  await client.close();

  // Il gratuito è finito: scheda fuori dai risultati, Area Partner ferma sull'abbonamento con l'avviso.
  const [after] = await sql<{ account: string; sub: string }[]>`
    select p.account_status as account, s.status as sub from partners p join subscriptions s on s.partner_id = p.id and s.free where p.id = ${partnerId}`;
  expect(after).toEqual({ account: "suspended", sub: "suspended" });
  const search = await browser.newPage();
  await search.goto("/idraulico/treviso");
  await expect(search.getByText(name)).toHaveCount(0);
  await search.close();
  await page.goto("/area-partner/lead");
  await expect(page).toHaveURL(/\/area-partner\/abbonamento$/);
  await expect(page.getByRole("heading", { level: 1, name: "Piano gratuito finito" })).toBeVisible();
  await expect(page.getByRole("alert").getByText("Hai ricevuto le 3 richieste gratuite")).toBeVisible();
  await expect(page.getByText("3 di 3")).toBeVisible();

  // Scelto un piano (attivazione di prova senza Stripe), torna online e l'Area Partner si riapre.
  await page.getByRole("button", { name: "Scegli Normal (prova senza pagare)" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Il tuo abbonamento" })).toBeVisible();
  const [{ account }] = await sql<{ account: string }[]>`select account_status as account from partners where id = ${partnerId}`;
  expect(account).toBe("active");
  await page.goto("/area-partner/lead");
  await page.getByText("Cliente Terzo").click();
  await expect(page.getByText(clientEmail)).toBeVisible();
});
