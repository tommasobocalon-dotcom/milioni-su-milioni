import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Prova vera su Stripe in modalità test (sandbox), con il database dei test end-to-end (geco_e2e). Non gira con
 * `npm test`: si lancia con `npm run test:stripe` (chiave sk_test_ in .env.vercel, database di `npm run dev` avviato).
 * Copre i problemi trovati il 12/11/2026 su un'azienda di prova: doppio abbonamento da due Checkout, discesa di piano
 * programmata nel portale che restava dopo una salita in promo, discesa non mostrata nella pagina abbonamento.
 */

// Solo da `npm run test:stripe` (vale anche in PowerShell, senza variabili da impostare a mano).
const RUN = process.env.npm_lifecycle_event === "test:stripe";
const KEY = process.env.STRIPE_SECRET_KEY ?? "";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: () => {}, updateTag: () => {} }));

describe.skipIf(!RUN)("Stripe sandbox: abbonamento, discesa programmata e cambio piano in promo", () => {
  let billing: typeof import("./stripe");
  let sql: import("postgres").Sql;
  let customer: string;
  let subscription: string;
  let partnerId: string;
  let listing: string;
  const payer = () => ({ partnerId, email: "stripe.sandbox@example.com", name: "Prova sandbox" });

  async function priceOf(lookup: string) {
    return (await billing.stripe().prices.list({ lookup_keys: [lookup], active: true, limit: 1 })).data[0].id;
  }

  async function dbPlan() {
    const [row] = await sql<{ code: string }[]>`
      select p.code from subscriptions s join plans p on p.id = s.plan_id
      where s.partner_id = ${partnerId} and s.status = 'active' order by s.created_at desc limit 1`;
    return row?.code;
  }

  beforeAll(async () => {
    // Mai sul conto vero né sul database di sviluppo o di produzione.
    if (!KEY.startsWith("sk_test_")) throw new Error("serve una chiave Stripe di test (sk_test_)");
    process.env.DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:54329/geco_e2e";
    billing = await import("./stripe");
    sql = (await import("postgres")).default(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

    [{ id: partnerId, listing }] = await sql<{ id: string; listing: string }[]>`select id, account_status as listing from partners where slug = 'elettro-bortolin'`;
    const c = await billing.stripe().customers.create({ name: "Prova sandbox geco", email: payer().email, metadata: { partnerId, test: "sandbox" } });
    customer = c.id;
    const pm = await billing.stripe().paymentMethods.attach("pm_card_visa", { customer });
    await billing.stripe().customers.update(customer, { invoice_settings: { default_payment_method: pm.id } });
    await sql`update partners set stripe_customer_id = ${customer} where id = ${partnerId}`;
    await sql`update subscriptions set status = 'cancelled' where partner_id = ${partnerId}`;
    await sql`delete from stripe_processed where key = ${`change-promo:${partnerId}`}`;
  }, 60_000);

  afterAll(async () => {
    if (subscription) await billing.stripe().subscriptions.cancel(subscription).catch(() => {});
    if (customer) await billing.stripe().customers.del(customer).catch(() => {});
    if (partnerId) {
      await sql`delete from subscriptions where partner_id = ${partnerId} and stripe_subscription_id is not null`;
      await sql`update subscriptions set status = 'active' where partner_id = ${partnerId}`;
      await sql`update partners set stripe_customer_id = null, account_status = ${listing} where id = ${partnerId}`;
      await sql`delete from stripe_processed where key = ${`change-promo:${partnerId}`}`;
    }
    await sql?.end();
  }, 60_000);

  it("senza abbonamenti apre il Checkout", async () => {
    expect(await billing.createSubscriptionCheckout(payer(), "normal", "monthly")).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  }, 30_000);

  it("con un abbonamento vivo in Stripe rifiuta un secondo Checkout, anche se il webhook non è ancora arrivato", async () => {
    const sub = await billing.stripe().subscriptions.create({ customer, items: [{ price: await priceOf("geco_normal_monthly") }], metadata: { kind: "subscription", partnerId } });
    subscription = sub.id;
    expect(sub.status).toBe("active");
    expect(await dbPlan()).toBeUndefined(); // il database non lo sa ancora
    await expect(billing.createSubscriptionCheckout(payer(), "base", "monthly")).rejects.toThrow("Hai già un abbonamento");
  }, 30_000);

  it("una discesa programmata nel portale si vede prima del rinnovo", async () => {
    // Quello che il webhook scrive per l'abbonamento appena creato.
    const sub = await billing.stripe().subscriptions.retrieve(subscription);
    const item = sub.items.data[0];
    await sql`
      insert into subscriptions (partner_id, plan_id, period, status, current_period_start, current_period_end, stripe_subscription_id)
      select ${partnerId}, id, 'monthly', 'active', ${new Date(item.current_period_start * 1000)}, ${new Date(item.current_period_end * 1000)}, ${subscription}
      from plans where code = 'normal'`;
    expect(await dbPlan()).toBe("normal");
    expect(await billing.pendingPlanChange(subscription)).toBeNull();

    // Come il portale: Normal fino al rinnovo, poi Base.
    const schedule = await billing.stripe().subscriptionSchedules.create({ from_subscription: subscription });
    const now = schedule.phases[0];
    await billing.stripe().subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        { items: [{ price: await priceOf("geco_normal_monthly") }], start_date: now.start_date, end_date: now.end_date },
        { items: [{ price: await priceOf("geco_base_monthly") }], duration: { interval: "month", interval_count: 1 } },
      ],
    });
    expect(await billing.pendingPlanChange(subscription)).toEqual({ planCode: "base", period: "monthly", from: new Date(now.end_date * 1000) });
  }, 60_000);

  it("salendo in promo il nuovo piano vale da subito e la discesa programmata sparisce", async () => {
    expect(await billing.changePromoUsed(partnerId)).toBe(false);
    const url = await billing.createPlanChangeSession(partnerId, "premium", "monthly");
    expect(url).toMatch(/\/area-partner\/abbonamento\?pagamento=cambio$/);

    const sub = await billing.stripe().subscriptions.retrieve(subscription);
    expect(sub.items.data[0].price.lookup_key).toBe("geco_premium_monthly");
    expect(sub.schedule).toBeNull();
    expect(await billing.pendingPlanChange(subscription)).toBeNull();
    expect(await billing.changePromoUsed(partnerId)).toBe(true);
    expect(await dbPlan()).toBe("premium");

    // Pagato al massimo il prezzo promo del Premium (79 € + IVA), meno i giorni non usati del Normal.
    const invoice = await billing.stripe().invoices.retrieve(sub.latest_invoice as string);
    expect(invoice.status).toBe("paid");
    expect(invoice.amount_paid).toBeLessThanOrEqual(Math.round(7900 * 1.22));
  }, 60_000);

  it("promo già usata: un altro cambio passa dalla conferma del portale Stripe, senza addebito immediato", async () => {
    const url = await billing.createPlanChangeSession(partnerId, "base", "monthly");
    expect(url).toMatch(/^https:\/\/billing\.stripe\.com\//);
    const sub = await billing.stripe().subscriptions.retrieve(subscription);
    expect(sub.items.data[0].price.lookup_key).toBe("geco_premium_monthly");
  }, 30_000);

  async function dbSubscription() {
    const [row] = await sql<{ status: string; cancel_at: Date | null; listing: string }[]>`
      select s.status, s.cancel_at, p.account_status as listing from subscriptions s join partners p on p.id = s.partner_id
      where s.stripe_subscription_id = ${subscription}`;
    return row;
  }

  it("disdetta dall'Area aziende: resta attivo fino alla fine del periodo pagato, poi niente rinnovo", async () => {
    const end = await billing.cancelSubscriptionAtPeriodEnd(partnerId, "Costa troppo");
    const sub = await billing.stripe().subscriptions.retrieve(subscription);
    expect(sub.status).toBe("active");
    expect(sub.cancel_at_period_end || sub.cancel_at !== null).toBe(true);
    expect(end).toEqual(new Date(sub.items.data[0].current_period_end * 1000));
    expect(sub.cancellation_details?.comment).toBe("Costa troppo");
    const row = await dbSubscription();
    expect(row.status).toBe("active");
    expect(row.cancel_at).toEqual(end);
  }, 60_000);

  it("annullare la disdetta prima della scadenza riporta il rinnovo automatico", async () => {
    await billing.resumeSubscription(partnerId);
    const sub = await billing.stripe().subscriptions.retrieve(subscription);
    expect(sub.cancel_at_period_end).toBe(false);
    expect(sub.cancel_at).toBeNull();
    expect((await dbSubscription()).cancel_at).toBeNull();
  }, 60_000);

  it("alla scadenza Stripe chiude l'abbonamento e la scheda esce dal sito", async () => {
    await billing.cancelSubscriptionAtPeriodEnd(partnerId, "");
    // Stripe a fine periodo: abbonamento chiuso ed evento customer.subscription.deleted.
    await billing.stripe().subscriptions.cancel(subscription);
    await billing.handleStripeEvent({ type: "customer.subscription.deleted", data: { object: { id: subscription } } } as never);
    const row = await dbSubscription();
    expect(row.status).toBe("cancelled");
    expect(row.listing).not.toBe("active");
  }, 60_000);
});
