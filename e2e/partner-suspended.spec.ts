import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { E2E_DATABASE_URL } from "../playwright.config";

/**
 * Account sospeso (pagamento fallito): l'Area Partner si riduce al solo pagamento. Ogni pagina rimanda
 * all'abbonamento, tranne l'abbonamento stesso (dove il partner paga per riattivarsi).
 */

const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });

/** Come il webhook Stripe: al pagamento fallito sia l'abbonamento sia l'account diventano "suspended". */
async function setStatus(status: string) {
  const [p] = await sql<{ id: string }[]>`select id from partners where slug = 'rossi-impianti'`;
  await sql`update subscriptions set status = ${status} where partner_id = ${p.id} and status in ('active', 'suspended')`;
  await sql`update partners set account_status = ${status} where id = ${p.id}`;
}

test.afterAll(async () => {
  await setStatus("active");
  await sql.end();
});

async function login(page: Page) {
  await page.goto("/accedi/azienda");
  await page.getByRole("textbox", { name: /^Email/ }).fill("mario@rossiimpianti.it");
  await page.getByLabel(/^Password/).fill("geco-demo-2026");
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/area-partner$/);
}

test("da sospeso l'Area Partner si riduce al solo pagamento", async ({ page }) => {
  await login(page);
  await setStatus("suspended");

  // Le pagine normali rimandano all'abbonamento.
  for (const path of ["/area-partner", "/area-partner/lead", "/area-partner/sponsorizzazioni", "/area-partner/scheda"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/area-partner\/abbonamento/);
  }

  // L'abbonamento resta raggiungibile e spiega la sospensione.
  await page.goto("/area-partner/abbonamento");
  await expect(page).toHaveURL(/\/area-partner\/abbonamento$/);
  await expect(page.getByText(/account sospeso/i)).toBeVisible();
});
