import { eq } from "drizzle-orm";
import { writeFileSync } from "node:fs";
import Stripe from "stripe";
import { plans } from "../src/lib/db/schema";
import { planLookupKey } from "../src/lib/domain/billing";
import { connect } from "./db-connection";

/**
 * Crea in Stripe (se mancano) un prodotto e due prezzi per ogni piano, più l'aliquota IVA 22%, e
 * salva gli id dei prezzi nella tabella plans. Si può rilanciare quando si vuole: riusa ciò che
 * trova (lookup_key dei prezzi, metadati dell'aliquota). Va rilanciato dopo `npm run db:reset`.
 *
 * Un prezzo Stripe non si modifica: se cambi il prezzo di un piano nel database, lo script crea un
 * prezzo nuovo e gli passa la lookup_key; gli abbonamenti già attivi restano sul prezzo vecchio.
 */
async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Imposta STRIPE_SECRET_KEY in .env.local (chiave di test sk_test_...)");
  const stripe = new Stripe(key);
  const { sql, db } = connect();

  const portalProducts: { product: string; prices: string[] }[] = [];
  for (const plan of await db.select().from(plans)) {
    const ids: Record<"monthly" | "yearly", string> = { monthly: "", yearly: "" };
    let productId: string | undefined;
    for (const [period, interval, amount] of [
      ["monthly", "month", plan.monthlyPriceCents],
      ["yearly", "year", plan.yearlyPriceCents],
    ] as const) {
      const lookupKey = planLookupKey(plan.code, period);
      const existing = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true })).data[0];
      if (existing) productId ??= typeof existing.product === "string" ? existing.product : existing.product.id;
      if (existing && existing.unit_amount === amount) {
        ids[period] = existing.id;
        continue;
      }
      productId ??= (await stripe.products.create({ name: `Piano ${plan.name}`, metadata: { planCode: plan.code } })).id;
      const price = await stripe.prices.create({
        product: productId,
        currency: "eur",
        unit_amount: amount,
        recurring: { interval },
        tax_behavior: "exclusive",
        lookup_key: lookupKey,
        // Il prezzo vecchio (importo diverso) cede la lookup_key al nuovo.
        transfer_lookup_key: true,
      });
      ids[period] = price.id;
    }
    await db.update(plans).set({ stripeMonthlyPriceId: ids.monthly, stripeYearlyPriceId: ids.yearly }).where(eq(plans.id, plan.id));
    const product = (await stripe.prices.retrieve(ids.monthly)).product as string;
    portalProducts.push({ product, prices: [ids.monthly, ids.yearly] });
    console.log(`[stripe] ${plan.name}: ${ids.monthly} (mese), ${ids.yearly} (anno)`);
  }

  const rates = await stripe.taxRates.list({ active: true, limit: 100 });
  const vat =
    rates.data.find((r) => r.metadata?.geco === "iva22") ??
    (await stripe.taxRates.create({ display_name: "IVA", percentage: 22, inclusive: false, country: "IT", jurisdiction: "IT", metadata: { geco: "iva22" } }));
  console.log(`\nAliquota IVA pronta (${vat.id}): il sito la ritrova da sola, STRIPE_TAX_RATE_ID non serve più.`);

  // Portale clienti: metodo di pagamento, fatture, disdetta a fine periodo, cambio tra i tre piani.
  const portalSettings = {
    business_profile: { headline: "geco: gestisci abbonamento e pagamenti" },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] as ("email" | "address" | "tax_id")[] },
      subscription_cancel: { enabled: true, mode: "at_period_end" as const },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"] as "price"[],
        proration_behavior: "create_prorations" as const,
        products: portalProducts,
      },
    },
    metadata: { geco: "portale" },
  };
  const portal = (await stripe.billingPortal.configurations.list({ active: true, limit: 100 })).data.find((c) => c.metadata?.geco === "portale");
  if (portal) await stripe.billingPortal.configurations.update(portal.id, portalSettings);
  else await stripe.billingPortal.configurations.create(portalSettings);
  console.log("Portale clienti pronto.");

  // Webhook verso il sito: Stripe mostra il segreto solo alla creazione, quindi lo scriviamo in .env.vercel
  // (escluso da git) insieme alla chiave, pronto da incollare su Vercel in un colpo solo.
  const webhookUrl = process.env.STRIPE_WEBHOOK_URL ?? "https://gecoitalia.it/api/stripe/webhook";
  const events: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
    "invoice.paid",
  ];
  const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((w) => w.url === webhookUrl);
  if (existing) {
    await stripe.webhookEndpoints.update(existing.id, { enabled_events: events });
    console.log(`Webhook già presente per ${webhookUrl}: eventi aggiornati, segreto invariato.`);
  } else {
    const created = await stripe.webhookEndpoints.create({ url: webhookUrl, enabled_events: events, description: "geco" });
    writeFileSync(".env.vercel", `STRIPE_SECRET_KEY=${key}\nSTRIPE_WEBHOOK_SECRET=${created.secret}\n`, { mode: 0o600 });
    console.log(`Webhook creato per ${webhookUrl}. Chiave e segreto in .env.vercel: copia tutto il file in Vercel → Environment Variables.`);
  }

  await sql.end();
}

main().catch((err) => {
  console.error("[stripe] configurazione non riuscita:", err);
  process.exit(1);
});
