import { expect, test } from "@playwright/test";
import postgres from "postgres";
import Stripe from "stripe";
import { E2E_STRIPE_WEBHOOK_SECRET } from "../playwright.config";

const sql = postgres("postgres://postgres:postgres@127.0.0.1:54329/postgres", { max: 1, onnotice: () => {} });
test.afterAll(() => sql.end());

const NO_SECRET = "server avviato senza STRIPE_WEBHOOK_SECRET di test: chiudi `npm run dev` e rilancia i test";

/** Evento firmato come lo firmerebbe Stripe con il segreto del webhook. */
function signed(event: object, secret = E2E_STRIPE_WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  return { data: payload, headers: { "content-type": "application/json", "stripe-signature": Stripe.webhooks.generateTestHeaderString({ payload, secret }) } };
}

async function purchases(partnerId: string) {
  const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from token_ledger where partner_id = ${partnerId} and reference = 'Pacchetto Piccolo'`;
  return count;
}

test("il webhook rifiuta un evento senza firma valida", async ({ request }) => {
  const res = await request.post("/api/stripe/webhook", signed({ id: "evt_falso", type: "checkout.session.completed", data: { object: {} } }, "whsec_sbagliato"));
  test.skip(res.status() === 503, NO_SECRET);
  expect(res.status()).toBe(400);
});

test("pacchetto token pagato: accredito una sola volta anche se Stripe ripete l'evento", async ({ request }) => {
  const [{ id: partnerId }] = await sql<{ id: string }[]>`select id from partners where slug = 'rossi-impianti'`;
  const sessionId = `cs_test_e2e_${Date.now()}`;
  const event = (id: string, type: string) => ({
    id,
    object: "event",
    type,
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        subscription: null,
        metadata: { kind: "tokens", partnerId, packageCode: "piccolo" },
      },
    },
  });
  const before = await purchases(partnerId);

  const first = await request.post("/api/stripe/webhook", signed(event(`evt_a_${sessionId}`, "checkout.session.completed")));
  test.skip(first.status() === 503, NO_SECRET);
  expect(first.status()).toBe(200);
  // Stessa consegna ripetuta e l'evento SEPA della stessa sessione: nessun nuovo accredito.
  expect((await request.post("/api/stripe/webhook", signed(event(`evt_a_${sessionId}`, "checkout.session.completed")))).status()).toBe(200);
  expect((await request.post("/api/stripe/webhook", signed(event(`evt_b_${sessionId}`, "checkout.session.async_payment_succeeded")))).status()).toBe(200);

  expect(await purchases(partnerId)).toBe(before + 1);
  const [{ amount }] = await sql<{ amount: number }[]>`select amount from token_ledger where partner_id = ${partnerId} and reference = 'Pacchetto Piccolo' order by created_at desc limit 1`;
  expect(amount).toBe(50);
});
