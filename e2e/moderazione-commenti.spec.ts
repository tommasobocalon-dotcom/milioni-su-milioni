import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import postgres from "postgres";
import { E2E_DATABASE_URL } from "../playwright.config";

/**
 * Commenti segnalati nel gestionale (13/11/2026): l'amministratore toglie un commento contrario alle regole oppure
 * respinge le segnalazioni. Togliere vale come violazione per chi ha scritto: avviso, poi stop ai commenti per 7 e
 * 30 giorni, poi blocco. Una contestazione accolta annulla la violazione e rimette il commento.
 */

const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
const TITLE = "Pergola in ferro a Mirano";
const BEA = "bea.moderazione@example.com";
const PASSWORD = "geco-demo-2026";
let work: string;
let bea: string;
let reporter: string;

test.beforeAll(async () => {
  const [{ id: rossi }] = await sql<{ id: string }[]>`select id from partners where slug = 'rossi-impianti'`;
  const [{ id: mario }] = await sql<{ id: string }[]>`select id from users where email = 'mario@rossiimpianti.it'`;
  await sql`update partners set account_status = 'active' where id = ${rossi}`;
  const account = (email: string, name: string) => sql<{ id: string }[]>`
    insert into users (email, name, role, password_hash, email_verified_at)
    select ${email}, ${name}, 'client', password_hash, now() from users where id = ${mario}
    on conflict (email) do update set name = excluded.name returning id`;
  [{ id: bea }] = await account(BEA, "Bea Conti");
  [{ id: reporter }] = await account("ugo.moderazione@example.com", "Ugo Ferri");
  [{ id: work }] = await sql<{ id: string }[]>`
    insert into portfolio_items (partner_id, kind, title, description, image_url, photos, created_at)
    values (${rossi}, 'work', ${TITLE}, 'Pergola su misura con copertura in policarbonato.',
            '/foto/categorie/ristrutturazioni.jpg', ${sql.array(["/foto/categorie/ristrutturazioni.jpg", "/foto/categorie/idraulici.webp"])}, now() + interval '4 hours')
    returning id`;
});

test.beforeEach(async () => {
  await sql`delete from portfolio_comments where portfolio_item_id = ${work}`;
  await sql`delete from user_strikes where user_id = ${bea}`;
});

test.afterAll(async () => {
  await sql`delete from portfolio_items where id = ${work}`;
  await sql`delete from users where email in ${sql([BEA, "ugo.moderazione@example.com"])}`;
  await sql.end();
});

const opened: BrowserContext[] = [];
test.afterEach(async () => {
  await Promise.all(opened.splice(0).map((c) => c.close()));
});

const workPath = () => `/ispirazione/${work}`;

/** Un commento di Bea già segnalato da Ugo. */
async function reported(body: string, reason = "offensive") {
  const [{ id }] = await sql<{ id: string }[]>`insert into portfolio_comments (portfolio_item_id, user_id, body) values (${work}, ${bea}, ${body}) returning id`;
  await sql`insert into comment_reports (comment_id, reporter_id, reason, note) values (${id}, ${reporter}, ${reason}::comment_report_reason, 'Tono offensivo verso chi ha fatto il lavoro')`;
  return id;
}

async function admin(browser: Browser) {
  const context = await browser.newContext({ locale: "it-IT" });
  opened.push(context);
  const page = await context.newPage();
  await page.goto("/admin/accedi");
  await page.getByRole("textbox", { name: /^Email/ }).fill("admin@gecoitalia.it");
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByRole("button", { name: "Entra nel gestionale" }).click();
  await page.waitForURL(/\/admin$/);
  page.on("dialog", (d) => d.accept());
  return page;
}

async function beaAtWork(browser: Browser) {
  const context = await browser.newContext({ locale: "it-IT" });
  opened.push(context);
  const page = await context.newPage();
  await page.goto(`/accedi?next=${encodeURIComponent(workPath())}`);
  await page.getByRole("textbox", { name: /^Email/ }).fill(BEA);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(new RegExp(`${workPath()}$`));
  return page;
}

const row = (page: Page, text: string) => page.getByRole("listitem").filter({ hasText: text });
const comments = (page: Page) => page.getByRole("region", { name: "Commenti" });

test("il gestionale è l'unico posto da cui si tolgono i commenti", async ({ page, browser }) => {
  await page.goto("/admin/commenti");
  await expect(page).toHaveURL(/\/admin\/accedi$/);
  const beaPage = await beaAtWork(browser);
  await beaPage.goto("/admin/commenti");
  await expect(beaPage.getByRole("heading", { level: 1, name: "Questa pagina non c'è" })).toBeVisible();
});

test("l'amministratore toglie un commento segnalato: la prima volta è un avviso", async ({ browser, page: visitor }) => {
  const id = await reported("Lavoro da incapaci, vergognatevi");
  const adminPage = await admin(browser);
  await adminPage.getByRole("link", { name: "1 commento segnalato da guardare" }).click();
  await expect(adminPage.getByRole("heading", { level: 1, name: "Commenti segnalati" })).toBeVisible();

  const item = row(adminPage, "Lavoro da incapaci");
  await expect(item).toContainText("Bea Conti");
  await expect(item).toContainText(BEA);
  await expect(item).toContainText("Offese o linguaggio volgare: Tono offensivo verso chi ha fatto il lavoro");
  // Il motivo proposto è quello segnalato.
  await expect(item.getByLabel("Motivo scritto all'autore")).toHaveValue("offensive");
  await item.getByRole("button", { name: "Togli il commento" }).click();
  // Il commento passa tra i decisi e la violazione compare con l'avviso all'autore.
  await expect(adminPage.getByRole("region", { name: "Da guardare" }).getByText("Nessun commento segnalato in attesa.")).toBeVisible();
  await expect(adminPage.getByRole("region", { name: "Già decisi" }).getByRole("listitem").filter({ hasText: "Lavoro da incapaci" })).toContainText("Tolto");
  const violation = adminPage.getByRole("region", { name: "Violazioni" }).getByRole("listitem").filter({ hasText: "Lavoro da incapaci" });
  await expect(violation).toContainText("Autore avvisato per email il");
  await expect(violation).toContainText("Violazioni che contano per questa persona: 1 · può commentare");

  const [comment] = await sql<{ status: string }[]>`select status from portfolio_comments where id = ${id}`;
  expect(comment.status).toBe("removed");
  expect((await sql<{ status: string }[]>`select status from comment_reports where comment_id = ${id}`)[0].status).toBe("accepted");
  const [strike] = await sql<{ reason: string; comment_body: string; decided_by: string }[]>`select reason, comment_body, decided_by from user_strikes where user_id = ${bea}`;
  expect(strike).toEqual({ reason: "offensive", comment_body: "Lavoro da incapaci, vergognatevi", decided_by: "admin@gecoitalia.it" });
  expect((await sql`select 1 from audit_logs where action = 'comment.remove' and entity_id = ${id}`).length).toBe(1);

  // Chi visita non lo vede più; chi l'ha scritto lo vede con la dicitura e può ancora commentare.
  await visitor.goto(workPath());
  await expect(comments(visitor).getByText("Nessun commento.")).toBeVisible();
  const beaPage = await beaAtWork(browser);
  await expect(comments(beaPage).getByRole("listitem").filter({ hasText: "Lavoro da incapaci" })).toContainText("Tolto dalla piattaforma perché contrario alle regole");
  await expect(beaPage.getByLabel("Scrivi un commento")).toBeVisible();
});

test("alla seconda violazione i commenti si fermano; la contestazione accolta annulla tutto", async ({ browser }) => {
  await sql`insert into user_strikes (user_id, reason, comment_body, decided_by, created_at) values (${bea}, 'spam', 'Vecchio commento tolto', 'admin@gecoitalia.it', now() - interval '20 days')`;
  const id = await reported("Siete dei buffoni e basta");
  const adminPage = await admin(browser);
  await adminPage.goto("/admin/commenti");
  const item = row(adminPage, "Siete dei buffoni");
  await expect(item).toContainText("l'autore ha già 1 violazione");
  await item.getByRole("button", { name: "Togli il commento" }).click();
  await expect(adminPage.getByRole("region", { name: "Violazioni" }).getByRole("listitem").filter({ hasText: "Siete dei buffoni" })).toContainText("commenti fermi fino al");

  const beaPage = await beaAtWork(browser);
  await expect(beaPage.getByText(/Non puoi commentare fino al \d+ \w+ 2026/)).toBeVisible();
  await expect(beaPage.getByLabel("Scrivi un commento")).toHaveCount(0);
  await expect(beaPage.getByRole("link", { name: "scrivi all'assistenza" })).toHaveAttribute("href", "/assistenza");

  // Contestazione accolta: violazione annullata, commento di nuovo visibile, si torna a commentare.
  const strike = adminPage.getByRole("region", { name: "Violazioni" }).getByRole("listitem").filter({ hasText: "Siete dei buffoni" });
  await expect(strike).toContainText("Violazioni che contano per questa persona: 2");
  await strike.getByRole("button", { name: "Annulla la violazione" }).click();
  await expect(adminPage.getByRole("region", { name: "Violazioni" }).getByRole("listitem").filter({ hasText: "Siete dei buffoni" })).toContainText("Annullata il");
  expect((await sql<{ status: string }[]>`select status from portfolio_comments where id = ${id}`)[0].status).toBe("visible");
  await beaPage.reload();
  await expect(beaPage.getByLabel("Scrivi un commento")).toBeVisible();
  await expect(comments(beaPage).getByRole("listitem").filter({ hasText: "Siete dei buffoni" })).not.toContainText("Tolto dalla piattaforma");
});

test("alla quarta violazione i commenti sono bloccati", async ({ browser }) => {
  for (const days of [90, 60, 40, 35]) {
    await sql`insert into user_strikes (user_id, reason, comment_body, decided_by, created_at) values (${bea}, 'offensive', 'Commento tolto', 'admin@gecoitalia.it', now() - make_interval(days => ${days}))`;
  }
  const beaPage = await beaAtWork(browser);
  await expect(beaPage.getByText(/Non puoi più commentare/)).toBeVisible();
  await expect(beaPage.getByLabel("Scrivi un commento")).toHaveCount(0);
  // Il resto dell'account funziona: il mi piace si mette ancora.
  await beaPage.getByRole("button", { name: "Mi piace" }).click();
  await expect(beaPage.getByRole("button", { name: "Mi piace" })).toHaveAttribute("aria-pressed", "true");
});

test("segnalazioni respinte: il commento resta e nessuno viene sanzionato", async ({ browser, page: visitor }) => {
  const id = await reported("Secondo me il ferro andava zincato", "other");
  const adminPage = await admin(browser);
  await adminPage.goto("/admin/commenti");
  await row(adminPage, "il ferro andava zincato").getByRole("button", { name: "Respingi le segnalazioni" }).click();
  await expect(adminPage.getByRole("region", { name: "Da guardare" }).getByText("Nessun commento segnalato in attesa.")).toBeVisible();
  await expect(adminPage.getByRole("region", { name: "Già decisi" }).getByRole("listitem").filter({ hasText: "il ferro andava zincato" })).toContainText("respinta");
  expect((await sql<{ status: string }[]>`select status from comment_reports where comment_id = ${id}`)[0].status).toBe("rejected");
  expect((await sql`select 1 from user_strikes where user_id = ${bea}`).length).toBe(0);
  await visitor.goto(workPath());
  await expect(comments(visitor).getByText("Secondo me il ferro andava zincato")).toBeVisible();
});
