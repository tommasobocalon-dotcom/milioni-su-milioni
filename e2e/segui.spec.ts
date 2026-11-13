import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { E2E_DATABASE_URL } from "../playwright.config";

/**
 * "Segui" sulle aziende (13/11/2026): chi ha fatto l'accesso segue un'azienda dal feed di Ispirazione, dalla pagina
 * di un lavoro o dalla scheda; i lavori delle aziende seguite stanno nella scheda "Seguiti". Uno per account e per
 * azienda, il conto dei follower è pubblico, la propria azienda non si segue.
 */

const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
const EDIL = { slug: "edil-brenta", name: "Edil Brenta Ristrutturazioni", href: "/professionisti/padova/ristrutturazioni/edil-brenta", work: "Tetto rifatto a Vigonza" };
const ROSSI = { slug: "rossi-impianti", name: "Rossi Impianti", work: "Centrale termica a Limena" };
let edil: string;
let rossi: string;
let mario: string;
const works: string[] = [];

test.beforeAll(async () => {
  [{ id: edil }] = await sql<{ id: string }[]>`select id from partners where slug = ${EDIL.slug}`;
  [{ id: rossi }] = await sql<{ id: string }[]>`select id from partners where slug = ${ROSSI.slug}`;
  [{ id: mario }] = await sql<{ id: string }[]>`select id from users where email = 'mario@rossiimpianti.it'`;
  await sql`update partners set account_status = 'active' where id in ${sql([edil, rossi])}`;
  // Mario gestisce Rossi Impianti e non Edil Brenta, qualunque cosa abbiano lasciato gli altri test.
  await sql`insert into partner_members (partner_id, user_id, role) values (${rossi}, ${mario}, 'owner') on conflict do nothing`;
  await sql`delete from partner_members where partner_id = ${edil} and user_id = ${mario}`;
  await sql`delete from partner_follows where user_id = ${mario}`;
  for (const [partner, title] of [[edil, EDIL.work], [rossi, ROSSI.work]] as const) {
    const [{ id }] = await sql<{ id: string }[]>`
      insert into portfolio_items (partner_id, kind, title, description, image_url, photos, created_at)
      values (${partner}, 'work', ${title}, 'Lavoro di prova per il test del tasto Segui.',
              '/foto/categorie/ristrutturazioni.jpg', ${sql.array(["/foto/categorie/ristrutturazioni.jpg", "/foto/categorie/idraulici.webp"])}, now() + interval '2 hours')
      returning id`;
    works.push(id);
  }
});

test.afterAll(async () => {
  await sql`delete from portfolio_items where id in ${sql(works)}`;
  await sql`delete from partner_follows where user_id = ${mario}`;
  await sql.end();
});

const follows = async (partner: string) => (await sql`select 1 from partner_follows where partner_id = ${partner} and user_id = ${mario}`).length;
const post = (page: Page, title: string) => page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: title }) });
const tabs = (page: Page) => page.getByRole("navigation", { name: "Quali lavori vedere" });

async function login(page: Page, next: string) {
  await page.goto(`/accedi?next=${encodeURIComponent(next)}`);
  await page.getByRole("textbox", { name: /^Email/ }).fill("mario@rossiimpianti.it");
  await page.getByLabel(/^Password/).fill("geco-demo-2026");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
}

test("senza accesso \"Segui\" porta al login e \"Seguiti\" chiede di entrare", async ({ page }) => {
  await page.goto(EDIL.href);
  await expect(page.getByText("Ancora nessun follower")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Segui/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Segui", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/accedi\\?next=${encodeURIComponent(EDIL.href)}$`));
  expect(await follows(edil)).toBe(0);

  await page.goto("/ispirazione");
  await tabs(page).getByRole("link", { name: "Seguiti" }).click();
  await expect(page).toHaveURL(/\/ispirazione\?seguiti=1$/);
  await expect(page.getByText("Per vedere i lavori delle aziende che segui devi prima entrare.")).toBeVisible();
  await expect(page.getByRole("heading", { name: EDIL.work })).toHaveCount(0);
});

test("seguire un'azienda dal feed la porta nella scheda Seguiti, con il conto sulla sua scheda", async ({ page }) => {
  await login(page, "/ispirazione");

  // Prima di seguire qualcuno la scheda Seguiti è vuota e spiega cosa fare.
  await tabs(page).getByRole("link", { name: "Seguiti" }).click();
  await expect(page.getByText(/Qui trovi i lavori delle aziende che segui/)).toBeVisible();
  await tabs(page).getByRole("link", { name: "Tutti i lavori" }).click();

  const follow = post(page, EDIL.work).getByRole("button", { name: `Segui ${EDIL.name}` });
  await follow.click();
  await expect(post(page, EDIL.work).getByRole("button", { name: /^Segui già/ })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => follows(edil)).toBe(1);

  // In "Seguiti" restano solo i lavori delle aziende seguite.
  await tabs(page).getByRole("link", { name: "Seguiti" }).click();
  await expect(page).toHaveURL(/seguiti=1/);
  await expect(page.getByRole("heading", { name: "Dalle aziende che segui" })).toBeVisible();
  await expect(page.getByRole("heading", { name: EDIL.work })).toBeVisible();
  await expect(page.getByRole("heading", { name: ROSSI.work })).toHaveCount(0);
  // I filtri per tipo non fanno uscire da "Seguiti".
  await page.getByRole("navigation", { name: "Filtra i lavori" }).getByRole("link", { name: "Agenzie" }).click();
  await expect(page).toHaveURL(/tipo=agenzie&seguiti=1$/);
  await expect(page.getByRole("heading", { name: EDIL.work })).toHaveCount(0);

  // Sulla scheda dell'azienda: stato e numero dei follower; si smette di seguire da lì.
  await page.goto(EDIL.href);
  const onProfile = page.getByRole("button", { name: /^Segui già/ });
  await expect(onProfile).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("1 follower")).toBeVisible();
  await onProfile.click();
  await expect(page.getByRole("button", { name: `Segui ${EDIL.name}` })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("Ancora nessun follower")).toBeVisible();
  await expect.poll(() => follows(edil)).toBe(0);
});

test("la propria azienda non si segue", async ({ page }) => {
  await login(page, "/ispirazione");
  const card = post(page, ROSSI.work);
  await card.getByRole("button", { name: `Segui ${ROSSI.name}` }).click();
  await expect(card.getByRole("alert")).toHaveText("Questa è la tua azienda: non serve seguirla.");
  await expect(card.getByRole("button", { name: `Segui ${ROSSI.name}` })).toHaveAttribute("aria-pressed", "false");
  expect(await follows(rossi)).toBe(0);
});
