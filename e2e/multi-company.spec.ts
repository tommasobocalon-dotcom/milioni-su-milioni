import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { E2E_DATABASE_URL } from "../playwright.config";

/**
 * Un account con più aziende (12/11/2026): l'Area Partner resta sempre sulla stessa azienda, si cambia solo dal
 * menu "Azienda", e pagine e azioni valgono per l'azienda scelta. Prima Postgres ne restituiva una a caso.
 * Mario (Rossi Impianti, Normal) gestisce anche Bianchi Idrotermica (Base) e Termoidraulica Brenta (Premium).
 */

const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
const SLUGS = ["rossi-impianti", "bianchi-idrotermica", "termoidraulica-brenta"] as const;
const PLAN = { "rossi-impianti": "normal", "bianchi-idrotermica": "base", "termoidraulica-brenta": "premium" } as const;
let ids: Record<(typeof SLUGS)[number], string>;
let mario: string;

async function planOf(slug: (typeof SLUGS)[number]) {
  const [row] = await sql<{ code: string }[]>`
    select p.code from subscriptions s join plans p on p.id = s.plan_id
    where s.partner_id = ${ids[slug]} and s.status = 'active' order by s.created_at desc limit 1`;
  return row?.code;
}

/** Stato di partenza: tre aziende in ordine di registrazione, piani mensili noti, promo del cambio piano mai usata. */
async function reset() {
  for (const [i, slug] of SLUGS.entries()) {
    await sql`update partners set created_at = ${new Date(Date.UTC(2026, i, 1))}, account_status = 'active' where id = ${ids[slug]}`;
    await sql`update subscriptions set status = 'cancelled' where partner_id = ${ids[slug]}`;
    await sql`
      insert into subscriptions (partner_id, plan_id, period, status, current_period_start, current_period_end)
      select ${ids[slug]}, id, 'monthly', 'active', now(), now() + interval '30 days' from plans where code = ${PLAN[slug]}`;
    await sql`delete from stripe_processed where key = ${`change-promo:${ids[slug]}`}`;
  }
}

test.beforeAll(async () => {
  const rows = await sql<{ id: string; slug: (typeof SLUGS)[number] }[]>`select id, slug from partners where slug in ${sql(SLUGS)}`;
  ids = Object.fromEntries(rows.map((r) => [r.slug, r.id])) as typeof ids;
  [{ id: mario }] = await sql<{ id: string }[]>`select id from users where email = 'mario@rossiimpianti.it'`;
  for (const slug of SLUGS.slice(1)) {
    await sql`insert into partner_members (partner_id, user_id, role) values (${ids[slug]}, ${mario}, 'owner') on conflict do nothing`;
  }
});

test.beforeEach(reset);

test.afterAll(async () => {
  await reset();
  for (const slug of SLUGS.slice(1)) await sql`delete from partner_members where partner_id = ${ids[slug]} and user_id = ${mario}`;
  await sql.end();
});

async function login(page: Page) {
  await page.goto("/accedi/azienda");
  await page.getByRole("textbox", { name: /^Email/ }).fill("mario@rossiimpianti.it");
  await page.getByLabel(/^Password/).fill("geco-demo-2026");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/area-partner$/);
}

/** Azienda scelta secondo il server (l'opzione `selected` della pagina), non quella appena toccata nel menu. */
const chosen = (page: Page) => page.getByLabel("Azienda", { exact: true }).locator("option[selected]");

async function choose(page: Page, name: string) {
  await page.getByLabel("Azienda", { exact: true }).selectOption({ label: name });
  await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), page.getByRole("button", { name: "Gestisci questa" }).click()]);
  await page.goto("/area-partner");
  await expect(chosen(page)).toHaveText(name);
}

/** Scheda di un piano nella scelta del piano. */
const planCard = (page: Page, name: string) => page.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 3, name, exact: true }) });

test("con più aziende l'Area Partner resta sempre sulla stessa finché non la cambi dal menu", async ({ page }) => {
  await login(page);

  // Senza scelta: sempre la prima registrata, a ogni caricamento.
  const menu = page.getByLabel("Azienda", { exact: true });
  await expect(menu.locator("option")).toHaveText(["Rossi Impianti", "Bianchi Idrotermica", "Termoidraulica Brenta"]);
  for (let i = 0; i < 5; i++) {
    await page.goto("/area-partner/abbonamento");
    await expect(page.getByText("89 € al mese + IVA")).toBeVisible();
    await expect(chosen(page)).toHaveText("Rossi Impianti");
  }

  // Bianchi (Base): piano Base e pacchetti bloccati, su ogni pagina.
  await choose(page, "Bianchi Idrotermica");
  await page.goto("/area-partner/abbonamento");
  await expect(page.getByText("39 € al mese + IVA")).toBeVisible();
  await page.goto("/area-partner/sponsorizzazioni");
  await expect(page.getByText("Disponibile con i piani Normal e Premium")).toBeVisible();
  await page.goto("/area-partner/profilo");
  await expect(page.getByText(/Bianchi Idrotermica/).nth(1)).toBeVisible();

  // Termoidraulica (Premium): pacchetti sbloccati.
  await choose(page, "Termoidraulica Brenta");
  await page.goto("/area-partner/sponsorizzazioni");
  await expect(page.getByRole("heading", { name: "Logo in Home" })).toBeVisible();
  await expect(page.getByText("Disponibile con i piani Normal e Premium")).toHaveCount(0);
});

test("il cambio piano vale per l'azienda scelta, non per le altre dell'account", async ({ page }) => {
  await login(page);
  await choose(page, "Bianchi Idrotermica");
  await page.goto("/area-partner/abbonamento");
  await planCard(page, "Premium").getByRole("button", { name: "Passa a Premium" }).click();
  await expect(page.getByText("199 € al mese + IVA")).toBeVisible();

  expect(await planOf("bianchi-idrotermica")).toBe("premium");
  expect(await planOf("rossi-impianti")).toBe("normal");
  expect(await planOf("termoidraulica-brenta")).toBe("premium");
});

test("promo nel cambio piano: anche scendendo, mai sul piano attuale, una volta per azienda", async ({ page }) => {
  await login(page);
  await choose(page, "Termoidraulica Brenta");
  await page.goto("/area-partner/abbonamento");

  // Premium mensile: il Normal (più economico) è in promo, il Premium mensile attuale no.
  await expect(planCard(page, "Normal").getByText(/^Promo/)).toBeVisible();
  await expect(planCard(page, "Premium").getByText(/^Promo/)).toHaveCount(0);
  await expect(planCard(page, "Premium").getByRole("button", { name: "Il tuo piano attuale" })).toBeDisabled();

  // Promo già usata da questa azienda: sparisce qui, resta per le altre aziende dello stesso account.
  await sql`insert into stripe_processed (key) values (${`change-promo:${ids["termoidraulica-brenta"]}`})`;
  await page.reload();
  await expect(planCard(page, "Normal").getByText(/^Promo/)).toHaveCount(0);
  await choose(page, "Rossi Impianti");
  await page.goto("/area-partner/abbonamento");
  await expect(planCard(page, "Premium").getByText(/^Promo/)).toBeVisible();
});

test("uscendo la scelta dell'azienda si azzera", async ({ page }) => {
  await login(page);
  await choose(page, "Bianchi Idrotermica");
  await page.getByRole("button", { name: "Esci" }).click();
  await expect(page).toHaveURL(/\/accedi\/azienda$/);
  await login(page);
  await expect(chosen(page)).toHaveText("Rossi Impianti");
});

test("un account con una sola azienda non vede il menu", async ({ page }) => {
  await sql`delete from partner_members where user_id = ${mario} and partner_id <> ${ids["rossi-impianti"]}`;
  try {
    await login(page);
    await expect(page.getByLabel("Azienda", { exact: true })).toHaveCount(0);
  } finally {
    for (const slug of SLUGS.slice(1)) {
      await sql`insert into partner_members (partner_id, user_id, role) values (${ids[slug]}, ${mario}, 'owner') on conflict do nothing`;
    }
  }
});
