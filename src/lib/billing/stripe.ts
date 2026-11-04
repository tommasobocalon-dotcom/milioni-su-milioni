import "server-only";
import { revalidateTag } from "next/cache";
import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db/client";
import { partners, plans, stripeProcessed, subscriptions, tokenLedger } from "@/lib/db/schema";
import { accountStatusFrom, grantsRenewalTokens, periodFromItems, planFromLookupKey, planLookupKey, subscriptionStatusFromStripe, tokenMonthsDue, tokenPurchaseFromCheckout, TRIAL_DAYS } from "@/lib/domain/billing";
import { TOKEN_PACKAGES } from "@/lib/domain/offers";
import { tokenExpiryFrom } from "@/lib/domain/tokens";

/**
 * Stripe Billing e Checkout (PRD §7, §13.1). Il webhook è l'unica fonte di verità: le azioni creano
 * solo le sessioni di pagamento, abbonamenti e token cambiano quando Stripe conferma l'incasso.
 */

let client: Stripe | undefined;

export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY non impostata");
  client ??= new Stripe(key);
  return client;
}

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

/** Carta e addebito SEPA (decisione del 26/10/2026), tra quelli attivi nel Dashboard: niente Klarna, Satispay… */
const PAYMENT_METHODS: Stripe.Checkout.SessionCreateParams.AllowedPaymentMethodType[] = ["card", "sepa_debit"];

let vatRateId: string | undefined;

/**
 * IVA 22% applicata a ogni addebito: l'aliquota creata da `npm run stripe:setup` (metadato geco=iva22),
 * cercata in Stripe la prima volta. STRIPE_TAX_RATE_ID, se impostata, ha la precedenza.
 */
async function taxRates(): Promise<string[] | undefined> {
  if (process.env.STRIPE_TAX_RATE_ID) return [process.env.STRIPE_TAX_RATE_ID];
  vatRateId ??= (await stripe().taxRates.list({ active: true, limit: 100 })).data.find((r) => r.metadata?.geco === "iva22")?.id;
  return vatRateId ? [vatRateId] : undefined;
}

/** Prezzo Stripe del piano: l'id salvato nel database o, se manca, quello con la lookup_key del piano. */
async function planPrice(plan: { code: string; stripeMonthlyPriceId: string | null; stripeYearlyPriceId: string | null }, period: "monthly" | "yearly") {
  const saved = period === "yearly" ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
  if (saved) return saved;
  return (await stripe().prices.list({ lookup_keys: [planLookupKey(plan.code, period)], active: true, limit: 1 })).data[0]?.id ?? null;
}

/** Errore da mostrare al partner così com'è. */
export class BillingError extends Error {}

type Payer = { partnerId: string; email: string; name: string };

/** Cliente Stripe del partner, creato al primo pagamento. */
async function customerFor({ partnerId, email, name }: Payer): Promise<string> {
  const [p] = await db
    .select({ customer: partners.stripeCustomerId, businessName: partners.businessName, vat: partners.vatNumber })
    .from(partners)
    .where(eq(partners.id, partnerId));
  if (p?.customer) return p.customer;
  // La chiave di idempotenza evita due clienti se il partner preme due volte.
  const customer = await stripe().customers.create(
    {
      email,
      name: p?.businessName ?? name,
      metadata: { partnerId, vatNumber: p?.vat ?? "" },
      preferred_locales: ["it"],
      // Partita IVA (11 cifre, già controllata alla registrazione): compare su ricevute e fatture Stripe.
      ...(p?.vat && /^\d{11}$/.test(p.vat) ? { tax_id_data: [{ type: "eu_vat" as const, value: `IT${p.vat}` }] } : {}),
    },
    { idempotencyKey: `customer:${partnerId}` },
  );
  await db.update(partners).set({ stripeCustomerId: customer.id }).where(eq(partners.id, partnerId));
  return customer.id;
}

export async function createTokenCheckout(payer: Payer, packageCode: string): Promise<string> {
  const pkg = TOKEN_PACKAGES.find((p) => p.code === packageCode);
  if (!pkg) throw new BillingError("Pacchetto non valido");
  const metadata = { kind: "tokens", partnerId: payer.partnerId, packageCode: pkg.code };
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: await customerFor(payer),
    locale: "it",
    allowed_payment_method_types: PAYMENT_METHODS,
    line_items: [
      {
        quantity: 1,
        tax_rates: await taxRates(),
        price_data: { currency: "eur", unit_amount: pkg.priceCents, product_data: { name: `Pacchetto token ${pkg.name} · ${pkg.tokens} token` } },
      },
    ],
    metadata,
    payment_intent_data: { metadata },
    invoice_creation: { enabled: true, invoice_data: { metadata } },
    success_url: `${appUrl()}/area-partner/token?pagamento=ok`,
    cancel_url: `${appUrl()}/area-partner/token`,
  });
  if (!session.url) throw new Error("Stripe non ha restituito l'indirizzo del Checkout");
  return session.url;
}

export async function createSubscriptionCheckout(payer: Payer, planCode: string, period: "monthly" | "yearly"): Promise<string> {
  const [plan] = await db.select().from(plans).where(eq(plans.code, planCode));
  if (!plan) throw new BillingError("Piano non valido");
  const price = await planPrice(plan, period);
  if (!price) throw new BillingError("Il piano non è ancora collegato a Stripe (npm run stripe:setup)");
  const [open] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.partnerId, payer.partnerId),
        isNotNull(subscriptions.stripeSubscriptionId),
        inArray(subscriptions.status, ["active", "suspended"]),
      ),
    );
  if (open) throw new BillingError("Hai già un abbonamento: cambia piano o metodo di pagamento dal portale");
  // Prova gratuita una sola volta per azienda: chi ha già avuto un abbonamento Stripe paga da subito.
  const [past] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.partnerId, payer.partnerId), isNotNull(subscriptions.stripeSubscriptionId)))
    .limit(1);
  const metadata = { kind: "subscription", partnerId: payer.partnerId };
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await customerFor(payer),
    locale: "it",
    allowed_payment_method_types: PAYMENT_METHODS,
    line_items: [{ price, quantity: 1 }],
    metadata,
    // Carta chiesta subito (impostazione predefinita di Checkout): alla fine della prova l'addebito parte da solo.
    subscription_data: { metadata, default_tax_rates: await taxRates(), ...(past ? {} : { trial_period_days: TRIAL_DAYS }) },
    success_url: `${appUrl()}/area-partner/abbonamento?pagamento=ok`,
    cancel_url: `${appUrl()}/area-partner/abbonamento`,
  });
  if (!session.url) throw new Error("Stripe non ha restituito l'indirizzo del Checkout");
  return session.url;
}

/** Customer Portal: metodo di pagamento, fatture, cambio piano, disdetta. */
export async function createPortalSession(partnerId: string): Promise<string> {
  const [p] = await db.select({ customer: partners.stripeCustomerId }).from(partners).where(eq(partners.id, partnerId));
  if (!p?.customer) throw new BillingError("Nessun pagamento ancora registrato con Stripe");
  // Configurazione del portale creata da `npm run stripe:setup` (metadato geco=portale); altrimenti quella predefinita.
  const configuration = (await stripe().billingPortal.configurations.list({ active: true, limit: 100 })).data.find((c) => c.metadata?.geco === "portale")?.id;
  const session = await stripe().billingPortal.sessions.create({
    customer: p.customer,
    locale: "it",
    return_url: `${appUrl()}/area-partner/abbonamento`,
    ...(configuration ? { configuration } : {}),
  });
  return session.url;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Segna un'operazione come eseguita. false se lo era già: l'effetto non va ripetuto. */
async function firstTime(tx: Tx, key: string): Promise<boolean> {
  const rows = await tx.insert(stripeProcessed).values({ key }).onConflictDoNothing().returning({ key: stripeProcessed.key });
  return rows.length > 0;
}

/** Le schede sospese o riattivate devono sparire o tornare subito nei risultati. */
function refreshPublicPages(slug: string) {
  revalidateTag(`partner:${slug}`, { expire: 0 });
  revalidateTag("catalog", { expire: 0 });
}

/**
 * Allinea l'abbonamento allo stato attuale in Stripe. Rilegge sempre l'abbonamento invece di fidarsi
 * dell'evento: così eventi duplicati o fuori ordine portano comunque allo stato giusto.
 */
async function syncSubscription(subscriptionId: string): Promise<{ id: string; partnerId: string } | null> {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const [partner] = await db
    .select({ id: partners.id, slug: partners.slug })
    .from(partners)
    .where(sub.metadata.partnerId ? eq(partners.id, sub.metadata.partnerId) : eq(partners.stripeCustomerId, customerId));
  if (!partner) {
    console.error("[stripe] abbonamento senza partner:", sub.id);
    return null;
  }
  const price = sub.items.data[0]?.price;
  if (!price) throw new Error(`Abbonamento Stripe ${sub.id} senza voci`);
  // Il piano si riconosce dalla lookup_key del prezzo (geco_normal_yearly); in alternativa dall'id salvato.
  const byKey = planFromLookupKey(price.lookup_key);
  const [plan] = await db
    .select({ id: plans.id, monthly: plans.stripeMonthlyPriceId })
    .from(plans)
    .where(byKey ? eq(plans.code, byKey.code) : or(eq(plans.stripeMonthlyPriceId, price.id), eq(plans.stripeYearlyPriceId, price.id)));
  // Senza piano non si sa cosa include l'abbonamento: errore, Stripe ritenta dopo la correzione.
  if (!plan) throw new Error(`Prezzo Stripe ${price.id} non collegato a nessun piano`);
  const priceId = price.id;
  const { start, end } = periodFromItems(sub.items.data);
  const values = {
    planId: plan.id,
    period: byKey?.period ?? (plan.monthly === priceId ? ("monthly" as const) : ("yearly" as const)),
    status: subscriptionStatusFromStripe(sub.status),
    currentPeriodStart: start,
    currentPeriodEnd: end,
  };

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(subscriptions)
      .values({ ...values, partnerId: partner.id, stripeSubscriptionId: sub.id })
      .onConflictDoUpdate({ target: subscriptions.stripeSubscriptionId, set: values })
      .returning({ id: subscriptions.id });
    // Gli abbonamenti creati senza Stripe (dati di esempio) lasciano il posto a quello pagato.
    if (values.status === "active") {
      await tx
        .update(subscriptions)
        .set({ status: "cancelled" })
        .where(and(eq(subscriptions.partnerId, partner.id), isNull(subscriptions.stripeSubscriptionId)));
    }
    const all =await tx.select({ status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.partnerId, partner.id));
    await tx.update(partners).set({ accountStatus: accountStatusFrom(all.map((s) => s.status)) }).where(eq(partners.id, partner.id));
    return row.id;
  });
  refreshPublicPages(partner.slug);
  return { id, partnerId: partner.id };
}

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? null));

/** Effetti di un evento webhook già verificato. Ogni effetto è idempotente. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const subscriptionId = idOf(session.subscription);
      if (subscriptionId) await syncSubscription(subscriptionId);
      const purchase = tokenPurchaseFromCheckout(session);
      if (!purchase) return;
      const now = new Date();
      await db.transaction(async (tx) => {
        if (!(await firstTime(tx, `checkout:${session.id}`))) return;
        await tx.insert(tokenLedger).values({
          partnerId: purchase.partnerId,
          kind: "purchase",
          amount: purchase.tokens,
          expiresAt: tokenExpiryFrom(now),
          reference: `Pacchetto ${purchase.name}`,
          createdAt: now,
        });
      });
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscription(event.data.object.id);
      return;

    case "invoice.paid": {
      // Periodo pagato: arrivano i token del piano (la prima quota mensile; le altre dell'annuale dal cron mensile).
      const invoice = event.data.object;
      const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);
      // La fattura a 0 € della prova gratuita non porta token: arrivano col primo pagamento vero.
      if (!subscriptionId || !grantsRenewalTokens(invoice.billing_reason) || invoice.amount_paid <= 0) return;
      const synced = await syncSubscription(subscriptionId);
      if (!synced) return;
      const now = new Date();
      await db.transaction(async (tx) => {
        if (!(await firstTime(tx, `invoice:${invoice.id}`))) return;
        const [plan] = await tx
          .select({ name: plans.name, tokens: plans.renewalTokens })
          .from(subscriptions)
          .innerJoin(plans, eq(plans.id, subscriptions.planId))
          .where(eq(subscriptions.id, synced.id));
        if (!plan?.tokens) return;
        await tx.insert(tokenLedger).values({
          partnerId: synced.partnerId,
          kind: "credit",
          amount: plan.tokens,
          expiresAt: tokenExpiryFrom(now),
          reference: `Crediti del piano ${plan.name}`,
          createdAt: now,
        });
      });
      return;
    }

    default:
      return;
  }
}

/**
 * Crediti del piano "ogni mese" per chi paga l'annuale: la prima quota arriva col pagamento (invoice.paid),
 * le altre una per ogni mese compiuto. Gira ogni giorno dal cron di Vercel; la chiave in stripe_processed
 * evita doppi accrediti anche se il job viene ripetuto.
 */
export async function grantMonthlyTokens(now = new Date()): Promise<number> {
  const rows = await db
    .select({ id: subscriptions.id, partnerId: subscriptions.partnerId, start: subscriptions.currentPeriodStart, name: plans.name, tokens: plans.renewalTokens })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(eq(subscriptions.status, "active"), eq(subscriptions.period, "yearly"), isNotNull(subscriptions.stripeSubscriptionId)));
  let granted = 0;
  for (const sub of rows) {
    if (sub.tokens <= 0) continue;
    for (let month = 2; month <= tokenMonthsDue(sub.start, now); month++) {
      await db.transaction(async (tx) => {
        if (!(await firstTime(tx, `monthly-tokens:${sub.id}:${sub.start.toISOString()}:${month}`))) return;
        await tx.insert(tokenLedger).values({
          partnerId: sub.partnerId,
          kind: "credit",
          amount: sub.tokens,
          expiresAt: tokenExpiryFrom(now),
          reference: `Crediti del piano ${sub.name} (mese ${month})`,
          createdAt: now,
        });
        granted++;
      });
    }
  }
  return granted;
}
