import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { E2E_DATABASE_URL } from "../playwright.config";

/**
 * "Mi piace" sui lavori di Ispirazione (13/11/2026): la pagina è un feed, un lavoro sotto l'altro. Chi ha fatto
 * l'accesso (cliente o azienda) mette e toglie il mi piace, uno per account e per lavoro; chi non l'ha fatto passa
 * dal login e torna alla pagina. Non sono recensioni né voti.
 */

const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
const TITLE = "Terrazzo impermeabilizzato a Mira";
let work: string;
let mario: string;
let admin: string;

test.beforeAll(async () => {
  const [{ id: partner }] = await sql<{ id: string }[]>`select id from partners where slug = 'rossi-impianti'`;
  await sql`update partners set account_status = 'active' where id = ${partner}`;
  [{ id: mario }] = await sql<{ id: string }[]>`select id from users where email = 'mario@rossiimpianti.it'`;
  [{ id: admin }] = await sql<{ id: string }[]>`select id from users where role = 'admin' limit 1`;
  [{ id: work }] = await sql<{ id: string }[]>`
    insert into portfolio_items (partner_id, kind, title, description, image_url, photos, created_at)
    values (${partner}, 'work', ${TITLE}, 'Guaina nuova, massetto in pendenza e piastrelle antigelive.',
            '/foto/categorie/idraulici.webp', ${sql.array(["/foto/categorie/idraulici.webp", "/foto/categorie/ristrutturazioni.jpg"])}, now() + interval '1 hour')
    returning id`;
});

test.afterAll(async () => {
  await sql`delete from portfolio_items where id = ${work}`;
  await sql.end();
});

const likes = async () => (await sql`select 1 from portfolio_likes where portfolio_item_id = ${work}`).length;
const post = (page: Page) => page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: TITLE }) });

test("il feed mostra un lavoro sotto l'altro, con l'azienda in testa e il conto dei mi piace", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/ispirazione");
  const card = post(page);
  await expect(card.getByRole("link", { name: "Rossi Impianti" })).toBeVisible();
  await expect(card.getByText("Ancora nessun mi piace")).toBeVisible();
  // Una sola colonna anche su schermo largo: ogni lavoro sta sotto il precedente.
  const boxes = await page.getByRole("region", { name: "Ultimi lavori" }).getByRole("listitem").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
  expect(boxes.length).toBeGreaterThan(0);
  expect(new Set(boxes.map(Math.round)).size).toBe(1);
});

test("senza accesso il cuore porta al login e poi si torna a Ispirazione", async ({ page }) => {
  await page.goto("/ispirazione?tipo=professionisti");
  const card = post(page);
  await expect(card.getByRole("button", { name: "Mi piace" })).toHaveCount(0);
  await card.getByRole("link", { name: "Accedi per mettere mi piace" }).click();
  await expect(page).toHaveURL(/\/accedi\?next=%2Fispirazione%3Ftipo%3Dprofessionisti$/);
  expect(await likes()).toBe(0);

  await page.getByRole("textbox", { name: /^Email/ }).fill("mario@rossiimpianti.it");
  await page.getByLabel(/^Password/).fill("geco-demo-2026");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/ispirazione\?tipo=professionisti$/);
  await expect(post(page).getByRole("button", { name: "Mi piace" })).toHaveAttribute("aria-pressed", "false");
});

test("chi ha fatto l'accesso mette e toglie il mi piace: uno per account", async ({ page }) => {
  await page.goto("/accedi?next=/ispirazione");
  await page.getByRole("textbox", { name: /^Email/ }).fill("mario@rossiimpianti.it");
  await page.getByLabel(/^Password/).fill("geco-demo-2026");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/ispirazione$/);

  const heart = post(page).getByRole("button", { name: "Mi piace" });
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(post(page).getByText("1 mi piace")).toBeVisible();
  await expect.poll(likes).toBe(1);

  // Resta dopo aver ricaricato la pagina, e il conto somma quelli degli altri account.
  await sql`insert into portfolio_likes (portfolio_item_id, user_id) values (${work}, ${admin})`;
  await page.reload();
  await expect(post(page).getByRole("button", { name: "Mi piace" })).toHaveAttribute("aria-pressed", "true");
  await expect(post(page).getByText("2 mi piace")).toBeVisible();

  // Stesso cuore nella pagina del lavoro: toglierlo lì toglie solo il proprio.
  await post(page).getByRole("link", { name: TITLE }).click();
  await expect(page).toHaveURL(new RegExp(`/ispirazione/${work}$`));
  const inPage = page.getByRole("button", { name: "Mi piace" });
  await expect(inPage).toHaveAttribute("aria-pressed", "true");
  await inPage.click();
  await expect(inPage).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("1 mi piace")).toBeVisible();
  await expect.poll(async () => (await sql`select 1 from portfolio_likes where portfolio_item_id = ${work} and user_id = ${mario}`).length).toBe(0);
  expect(await likes()).toBe(1);
});
