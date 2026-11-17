import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { E2E_DATABASE_URL } from "../playwright.config";

/**
 * Email "Com'è andata?": 3 giorni dopo la consegna il cron scrive al cliente; dalla pagina del link il cliente dice se
 * l'azienda l'ha richiamato e, se no, trova altre aziende della stessa categoria vicino al suo comune.
 */

const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
const created: string[] = [];
test.afterAll(async () => {
  if (created.length) await sql`delete from leads where id in ${sql(created)}`;
  await sql.end();
});

/** Richiesta a Rossi Impianti (idraulico, Padova) consegnata `days` giorni fa, copiata da una esistente. */
async function leadDeliveredDaysAgo(days: number) {
  const at = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const [{ id }] = await sql<{ id: string }[]>`
    insert into leads
    select * from jsonb_populate_record(null::leads, (select to_jsonb(l) from leads l limit 1)
      || jsonb_build_object(
           'id', gen_random_uuid(),
           'partner_id', (select id from partners where slug = 'rossi-impianti'),
           'category_id', (select category_id from partners where slug = 'rossi-impianti'),
           'municipality_id', (select id from municipalities where name = 'Padova'),
           'request_type', 'Rifacimento bagno completo',
           'charge', 'quota', 'report_status', null, 'verified_at', ${at}::text, 'delivered_at', ${at}::text,
           'follow_up_sent_at', null, 'client_contacted', null, 'client_answered_at', null))
    returning id`;
  created.push(id);
  return id;
}

test("il cron manda l'email una volta sola e il cliente non richiamato vede altre aziende", async ({ page, request }) => {
  const id = await leadDeliveredDaysAgo(4);

  const first = await request.get("/api/cron/esito-richieste");
  expect(first.ok()).toBe(true);
  expect((await first.json()).sent).toBeGreaterThanOrEqual(1);
  const [{ follow_up_sent_at }] = await sql<{ follow_up_sent_at: Date | null }[]>`select follow_up_sent_at from leads where id = ${id}`;
  expect(follow_up_sent_at).not.toBeNull();
  await request.get("/api/cron/esito-richieste");
  const [again] = await sql<{ follow_up_sent_at: Date }[]>`select follow_up_sent_at from leads where id = ${id}`;
  expect(again.follow_up_sent_at).toEqual(follow_up_sent_at);

  await page.goto(`/richiesta/com-e-andata/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Com'è andata con Rossi Impianti?" })).toBeVisible();
  await page.getByRole("button", { name: "No, nessuno mi ha chiamato" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Ci dispiace, grazie per avercelo detto" })).toBeVisible();
  const alternatives = page.getByRole("region", { name: /vicino a Padova/ });
  await expect(alternatives).toBeVisible();
  await expect(alternatives.getByRole("heading", { name: "Rossi Impianti" })).toHaveCount(0);
  const [row] = await sql<{ client_contacted: boolean }[]>`select client_contacted from leads where id = ${id}`;
  expect(row.client_contacted).toBe(false);
});

test("il cliente richiamato vede il grazie e la risposta resta salvata", async ({ page }) => {
  const id = await leadDeliveredDaysAgo(4);
  await page.goto(`/richiesta/com-e-andata/${id}`);
  await page.getByRole("button", { name: "Sì, mi ha ricontattato" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Grazie per averci risposto" })).toBeVisible();
  const [row] = await sql<{ client_contacted: boolean }[]>`select client_contacted from leads where id = ${id}`;
  expect(row.client_contacted).toBe(true);
});
