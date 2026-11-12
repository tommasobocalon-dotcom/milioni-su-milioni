import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { E2E_DATABASE_URL } from "../playwright.config";

/**
 * Lavori in Ispirazione (12/11/2026): li pubblica solo l'azienda dall'Area Partner, da 2 a 8 foto con titolo e breve
 * descrizione; fino a 5 progetti con il Base, 25 con il Normal, senza limiti con il Premium. Foto vere da Unsplash
 * (e2e/fixtures/unsplash). Mario gestisce quattro aziende e passa dall'una all'altra con il menu "Azienda".
 */

const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
const COMPANIES = {
  "bianchi-idrotermica": { name: "Bianchi Idrotermica", plan: "base" },
  "rossi-impianti": { name: "Rossi Impianti", plan: "normal" },
  "termoidraulica-brenta": { name: "Termoidraulica Brenta", plan: "premium" },
  "casa-veneta-immobiliare": { name: "Casa Veneta Immobiliare", plan: "normal" },
} as const;
type Slug = keyof typeof COMPANIES;
let ids: Record<Slug, string>;
let mario: string;
const started = new Date();

const photo = (name: string) => path.join(__dirname, "fixtures", "unsplash", `${name}.jpg`);
const photos = (kind: string, n: number) => Array.from({ length: n }, (_, i) => photo(`${kind}-${(i % 4) + 1}`));

/** Progetti finti già in bacheca, per arrivare vicino al limite del piano senza caricarli uno a uno. */
async function fillPortfolio(slug: Slug, count: number) {
  for (let i = 0; i < count; i++) {
    await sql`
      insert into portfolio_items (partner_id, kind, title, description, image_url, photos, sort_order)
      values (${ids[slug]}, 'work', ${`Lavoro di prova ${i + 1}`}, 'Progetto già in bacheca per il test dei limiti.',
              '/foto/categorie/idraulici.webp', ${sql.array(["/foto/categorie/idraulici.webp", "/foto/categorie/ristrutturazioni.jpg"])}, ${100 + i})`;
  }
}

test.beforeAll(async () => {
  const rows = await sql<{ id: string; slug: Slug }[]>`select id, slug from partners where slug in ${sql(Object.keys(COMPANIES))}`;
  ids = Object.fromEntries(rows.map((r) => [r.slug, r.id])) as typeof ids;
  [{ id: mario }] = await sql<{ id: string }[]>`select id from users where email = 'mario@rossiimpianti.it'`;
  for (const [i, [slug, c]] of Object.entries(COMPANIES).entries()) {
    const id = ids[slug as Slug];
    await sql`insert into partner_members (partner_id, user_id, role) values (${id}, ${mario}, 'owner') on conflict do nothing`;
    await sql`update partners set created_at = ${new Date(Date.UTC(2026, i, 1))}, account_status = 'active' where id = ${id}`;
    await sql`update subscriptions set status = 'cancelled' where partner_id = ${id}`;
    await sql`
      insert into subscriptions (partner_id, plan_id, period, status, current_period_start, current_period_end)
      select ${id}, id, 'monthly', 'active', now(), now() + interval '30 days' from plans where code = ${c.plan}`;
    await sql`delete from portfolio_items where partner_id = ${id}`;
  }
});

test.afterAll(async () => {
  for (const slug of Object.keys(COMPANIES) as Slug[]) {
    await sql`delete from portfolio_items where partner_id = ${ids[slug]} and created_at >= ${started}`;
    if (slug !== "rossi-impianti") await sql`delete from partner_members where partner_id = ${ids[slug]} and user_id = ${mario}`;
  }
  await sql.end();
});

async function login(page: Page) {
  await page.goto("/accedi/azienda");
  await page.getByRole("textbox", { name: /^Email/ }).fill("mario@rossiimpianti.it");
  await page.getByLabel(/^Password/).fill("geco-demo-2026");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/area-partner$/);
}

async function choose(page: Page, slug: Slug) {
  await page.getByLabel("Azienda", { exact: true }).selectOption({ label: COMPANIES[slug].name });
  await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), page.getByRole("button", { name: "Gestisci questa" }).click()]);
  await page.goto("/area-partner/scheda");
  await expect(page.getByLabel("Azienda", { exact: true }).locator("option[selected]")).toHaveText(COMPANIES[slug].name);
}

/** Compila e invia il modulo "Aggiungi un lavoro" (o "Aggiungi un immobile" per le agenzie). */
async function publish(page: Page, p: { title: string; description: string; files: string[] }) {
  await page.getByLabel(/^Titolo/).fill(p.title);
  await page.getByLabel(/^Foto/).setInputFiles(p.files);
  await page.getByLabel(/^Descrizione/).fill(p.description);
  await page.getByRole("button", { name: "Pubblica il lavoro" }).click();
}

/** Pubblicato: il lavoro compare nell'elenco della scheda (il messaggio di conferma resta dal lavoro precedente). */
async function published(page: Page, title: string) {
  await expect(page.getByRole("region", { name: "Elementi del portfolio" }).getByText(title, { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Lavoro pubblicato nella tua scheda e in Ispirazione")).toBeVisible();
}

/** Errore del modulo (la pagina ha anche l'annuncio delle navigazioni di Next con ruolo alert). */
const formError = (page: Page) => page.locator("form").getByRole("alert");

test("solo le aziende pubblicano: da fuori l'Area Partner chiede l'accesso aziende", async ({ page }) => {
  await page.goto("/ispirazione");
  await expect(page.getByRole("link", { name: "Pubblica i tuoi lavori" })).toHaveAttribute("href", "/area-partner/scheda");
  await expect(page.getByLabel(/^Foto/)).toHaveCount(0);
  await page.goto("/area-partner/scheda");
  await expect(page).toHaveURL(/\/accedi\/azienda/);
});

test("un lavoro vuole da 2 a 8 foto, un titolo e una breve descrizione", async ({ page }) => {
  await login(page);
  await choose(page, "rossi-impianti");

  await publish(page, { title: "Caldaia sostituita", description: "Caldaia a condensazione nuova.", files: photos("bagno", 1) });
  await expect(formError(page)).toHaveText("Carica almeno 2 foto del lavoro");
  await publish(page, { title: "Caldaia sostituita", description: "Caldaia a condensazione nuova.", files: photos("bagno", 9) });
  await expect(formError(page)).toHaveText("Al massimo 8 foto per progetto");
  expect((await sql`select 1 from portfolio_items where partner_id = ${ids["rossi-impianti"]}`).length).toBe(0);

  // Titolo e descrizione sono obbligatori (il browser non invia il modulo senza).
  await expect(page.getByLabel(/^Titolo/)).toHaveAttribute("required", "");
  await expect(page.getByLabel(/^Descrizione/)).toHaveAttribute("required", "");
  await expect(page.getByLabel(/^Descrizione/)).toHaveAttribute("maxlength", "300");

  // Esattamente 8 foto: pubblicato, nella scheda e in Ispirazione con tutte le foto.
  await publish(page, {
    title: "Bagno rifatto a Noale",
    description: "Demolizione, impianto idraulico nuovo, piatto doccia filo pavimento e mobile sospeso. Lavoro finito in dieci giorni.",
    files: photos("bagno", 8),
  });
  await published(page, "Bagno rifatto a Noale");
  const [row] = await sql<{ photos: string[]; image_url: string }[]>`select photos, image_url from portfolio_items where partner_id = ${ids["rossi-impianti"]}`;
  expect(row.photos).toHaveLength(8);
  expect(row.image_url).toBe(row.photos[0]);

  await page.goto("/ispirazione");
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Bagno rifatto a Noale" }) });
  await expect(card.getByText("8 foto")).toBeVisible();
  await expect(card.getByRole("img")).toHaveCount(8);
  await expect(card.getByText(/Demolizione, impianto idraulico nuovo/)).toBeVisible();
  await expect(card.getByRole("link", { name: "Rossi Impianti" })).toBeVisible();
  // Le foto si scorrono di lato.
  const strip = card.getByRole("region", { name: /Bagno rifatto a Noale: 8 foto/ });
  await strip.evaluate((el) => el.scrollBy({ left: el.clientWidth }));
  await expect.poll(() => strip.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
});

test("piano Base: al massimo 5 progetti", async ({ page }) => {
  await login(page);
  await choose(page, "bianchi-idrotermica");
  const works = [
    ["Bagno rinnovato a Treviso", "bagno", 2],
    ["Cucina con impianto nuovo", "cucina", 3],
    ["Pareti del soggiorno ripitturate", "pittura", 4],
    ["Doccia al posto della vasca", "bagno", 2],
    ["Lavello e scarichi della cucina", "cucina", 2],
  ] as const;
  for (const [title, kind, n] of works) {
    await publish(page, { title, description: `${title}: lavoro completo, dal sopralluogo alla pulizia finale.`, files: photos(kind, n) });
    await published(page, title);
  }
  await expect(page.getByText("5 di 5 progetti del piano Base")).toBeVisible();
  await publish(page, { title: "Sesto lavoro", description: "Questo non entra nel piano Base.", files: photos("pittura", 2) });
  await expect(formError(page)).toHaveText("Il piano Base include fino a 5 progetti: elimina un progetto o cambia piano");
  expect((await sql`select 1 from portfolio_items where partner_id = ${ids["bianchi-idrotermica"]}`).length).toBe(5);
});

test("piano Normal: al massimo 25 progetti", async ({ page }) => {
  await sql`delete from portfolio_items where partner_id = ${ids["rossi-impianti"]}`;
  await fillPortfolio("rossi-impianti", 24);
  await login(page);
  await choose(page, "rossi-impianti");
  await publish(page, { title: "Cucina su misura a Mestre", description: "Smontaggio della vecchia cucina, impianti e montaggio della nuova.", files: photos("cucina", 4) });
  await published(page, "Cucina su misura a Mestre");
  await expect(page.getByText("25 di 25 progetti del piano Normal")).toBeVisible();
  await publish(page, { title: "Ventiseiesimo lavoro", description: "Questo non entra nel piano Normal.", files: photos("cucina", 2) });
  await expect(formError(page)).toHaveText("Il piano Normal include fino a 25 progetti: elimina un progetto o cambia piano");
});

test("piano Premium: progetti senza limiti", async ({ page }) => {
  await fillPortfolio("termoidraulica-brenta", 30);
  await login(page);
  await choose(page, "termoidraulica-brenta");
  await expect(page.getByText("Progetti senza limiti con il piano Premium")).toBeVisible();
  await publish(page, {
    title: "Facciata e cappotto termico",
    description: "Ponteggio, cappotto da 12 cm, intonaco e tinteggiatura della facciata di una bifamiliare.",
    files: photos("cantiere", 6),
  });
  await published(page, "Facciata e cappotto termico");
  expect((await sql`select 1 from portfolio_items where partner_id = ${ids["termoidraulica-brenta"]}`).length).toBe(31);
});

test("un'agenzia pubblica un immobile con le foto e compare in Ispirazione", async ({ page }) => {
  await login(page);
  await choose(page, "casa-veneta-immobiliare");
  await expect(page.getByRole("heading", { name: "Aggiungi un immobile" })).toBeVisible();
  await publish(page, {
    title: "Trilocale luminoso in centro",
    description: "Ristrutturato, due camere, soggiorno con cucina a vista e terrazzo.",
    files: photos("casa", 3),
  });
  await published(page, "Trilocale luminoso in centro");
  await page.goto("/ispirazione");
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Trilocale luminoso in centro" }) });
  await expect(card.getByText("3 foto")).toBeVisible();
  await expect(card.getByRole("link", { name: "Casa Veneta Immobiliare" })).toBeVisible();
});

test("senza un piano attivo non si pubblica", async ({ page }) => {
  await sql`update subscriptions set status = 'cancelled' where partner_id = ${ids["termoidraulica-brenta"]}`;
  try {
    await login(page);
    await choose(page, "termoidraulica-brenta");
    await publish(page, { title: "Lavoro senza piano", description: "Non deve essere pubblicato.", files: photos("cantiere", 2) });
    await expect(formError(page)).toHaveText("Attiva un piano per pubblicare i tuoi lavori");
  } finally {
    await sql`
      insert into subscriptions (partner_id, plan_id, period, status, current_period_start, current_period_end)
      select ${ids["termoidraulica-brenta"]}, id, 'monthly', 'active', now(), now() + interval '30 days' from plans where code = 'premium'`;
  }
});
