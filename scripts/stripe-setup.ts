import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { plans } from "../src/lib/db/schema";
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

  for (const plan of await db.select().from(plans)) {
    const ids: Record<"monthly" | "yearly", string> = { monthly: "", yearly: "" };
    let productId: string | undefined;
    for (const [period, interval, amount] of [
      ["monthly", "month", plan.monthlyPriceCents],
      ["yearly", "year", plan.yearlyPriceCents],
    ] as const) {
      const lookupKey = `geco_${plan.code}_${period}`;
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
    console.log(`[stripe] ${plan.name}: ${ids.monthly} (mese), ${ids.yearly} (anno)`);
  }

  const rates = await stripe.taxRates.list({ active: true, limit: 100 });
  const vat =
    rates.data.find((r) => r.metadata?.geco === "iva22") ??
    (await stripe.taxRates.create({ display_name: "IVA", percentage: 22, inclusive: false, country: "IT", jurisdiction: "IT", metadata: { geco: "iva22" } }));
  console.log(`\nAliquota IVA: aggiungi in .env.local (e su Vercel)\nSTRIPE_TAX_RATE_ID=${vat.id}`);

  await sql.end();
}

main().catch((err) => {
  console.error("[stripe] configurazione non riuscita:", err);
  process.exit(1);
});
