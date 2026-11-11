import "server-only";
import { revalidateTag } from "next/cache";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db/client";
import { municipalities, partners, plans, stripeProcessed, subscriptions, tokenLedger } from "@/lib/db/schema";
import { accountStatusFrom, areaExtensionFromCheckout, grantsRenewalTokens, homeSponsorFromCheckout, searchBoostFromCheckout, periodFromItems, planFromLookupKey, planLookupKey, subscriptionStatusFromStripe, tokenMonthsDue, tokenPurchaseFromCheckout, TRIAL_DAYS } from "@/lib/domain/billing";
import { AREA_EXTENSION_OFFER, changePromo, HOME_SPONSOR_PACKAGES, homeSponsorPrice, launchDate, municipalityIdsFrom, planPromo, type PlanPromo, SEARCH_BOOST_PACKAGES, TOKEN_PACKAGES } from "@/lib/domain/offers";
import { grantAreaExtensions, grantHomeSponsor, grantSearchBoost } from "@/lib/leads/service";
import { tokenExpiryFrom } from "@/lib/domain/tokens";

/**
 * Stripe Billing e Checkout (PRD §7, §13.1). Le azioni creano solo le sessioni di pagamento: abbonamenti e
 * token cambiano quando Stripe conferma l'incasso, via webhook o rileggendo la sessione al ritorno dal Checkout.
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
    success_url: `${appUrl()}/api/stripe/ritorno?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/area-partner/token`,
  });
  if (!session.url) throw new Error("Stripe non ha restituito l'indirizzo del Checkout");
  return session.url;
}

/** Pacchetto a pagamento unico (logo in Home, boost nella ricerca): una riga con IVA, ricevuta e fattura per email. */
async function packageCheckout(payer: Payer, p: { kind: string; code: string; name: string; cents: number; back: string }): Promise<string> {
  const metadata = { kind: p.kind, partnerId: payer.partnerId, packageCode: p.code };
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: await customerFor(payer),
    locale: "it",
    allowed_payment_method_types: PAYMENT_METHODS,
    line_items: [{ quantity: 1, tax_rates: await taxRates(), price_data: { currency: "eur", unit_amount: p.cents, product_data: { name: p.name } } }],
    metadata,
    payment_intent_data: { metadata },
    invoice_creation: { enabled: true, invoice_data: { metadata } },
    success_url: `${appUrl()}/api/stripe/ritorno?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/area-partner/token#${p.back}`,
  });
  if (!session.url) throw new Error("Stripe non ha restituito l'indirizzo del Checkout");
  return session.url;
}

/** Logo in evidenza in Home per 7 o 30 giorni, pagato in euro (prezzo promo nei primi 6 mesi dal lancio). */
export async function createHomeSponsorCheckout(payer: Payer, packageCode: string): Promise<string> {
  const pkg = HOME_SPONSOR_PACKAGES.find((p) => p.code === packageCode);
  if (!pkg) throw new BillingError("Pacchetto non valido");
  const price = homeSponsorPrice(pkg, new Date(), launchDate());
  const name = `Logo in evidenza in Home · ${pkg.days} giorni${price.promo ? " (promo lancio)" : ""}`;
  return packageCheckout(payer, { kind: "home_sponsor", code: pkg.code, name, cents: price.cents, back: "home" });
}

/** Boost "Sponsorizzato nella ricerca" per 24 o 48 ore, pagato in euro. */
export async function createSearchBoostCheckout(payer: Payer, packageCode: string): Promise<string> {
  const pkg = SEARCH_BOOST_PACKAGES.find((p) => p.code === packageCode);
  if (!pkg) throw new BillingError("Pacchetto non valido");
  return packageCheckout(payer, { kind: "search_boost", code: pkg.code, name: `Sponsorizzato nella ricerca · ${pkg.hours} ore`, cents: pkg.priceCents, back: "boost" });
}

/** Estensione territoriale: 49 € + IVA per ogni comune scelto, per 30 giorni. */
export async function createAreaExtensionCheckout(payer: Payer, ids: number[]): Promise<string> {
  const valid = municipalityIdsFrom(ids);
  const chosen = valid ? await db.select({ id: municipalities.id, name: municipalities.name }).from(municipalities).where(inArray(municipalities.id, valid)) : [];
  if (chosen.length === 0) throw new BillingError("Scegli almeno un comune");
  const metadata = { kind: "area_extension", partnerId: payer.partnerId, municipalityIds: chosen.map((m) => m.id).join(",") };
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: await customerFor(payer),
    locale: "it",
    allowed_payment_method_types: PAYMENT_METHODS,
    line_items: [
      {
        quantity: chosen.length,
        tax_rates: await taxRates(),
        price_data: {
          currency: "eur",
          unit_amount: AREA_EXTENSION_OFFER.priceCents,
          product_data: {
            name: `Estensione territoriale · ${AREA_EXTENSION_OFFER.days} giorni per comune`,
            description: chosen.map((m) => m.name).join(", ").slice(0, 500),
          },
        },
      },
    ],
    metadata,
    payment_intent_data: { metadata },
    invoice_creation: { enabled: true, invoice_data: { metadata } },
    success_url: `${appUrl()}/api/stripe/ritorno?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/area-partner/token#estensione`,
  });
  if (!session.url) throw new Error("Stripe non ha restituito l'indirizzo del Checkout");
  return session.url;
}

/**
 * Sconto Stripe della promo sul primo pagamento del piano. Dura un mese da quando si applica: copre la prima fattura
 * dopo i 7 giorni di prova, mentre con "once" lo consumerebbe la fattura a 0 € della prova. L'id contiene l'importo,
 * così se cambia la promo nasce un coupon nuovo.
 */
async function promoCoupon(planCode: string, period: "monthly" | "yearly", amountOffCents: number, duration: "repeating" | "once" = "repeating"): Promise<string> {
  const id = `geco-promo-${planCode}-${period}-${amountOffCents}${duration === "once" ? "-once" : ""}`;
  try {
    return (await stripe().coupons.retrieve(id)).id;
  } catch (err) {
    if (!(err instanceof Stripe.errors.StripeInvalidRequestError && err.code === "resource_missing")) throw err;
  }
  const coupon = await stripe().coupons.create(
    { id, amount_off: amountOffCents, currency: "eur", ...(duration === "once" ? { duration } : { duration, duration_in_months: 1 }), name: period === "yearly" ? "Promo lancio annuale" : "Promo primo mese" },
    { idempotencyKey: `coupon:${id}` },
  );
  return coupon.id;
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
  const promo = planPromo(plan, period, new Date(), launchDate());
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await customerFor(payer),
    locale: "it",
    allowed_payment_method_types: PAYMENT_METHODS,
    line_items: [{ price, quantity: 1 }],
    metadata,
    ...(promo ? { discounts: [{ coupon: await promoCoupon(plan.code, period, promo.listCents - promo.payNowCents) }] } : {}),
    // Carta chiesta subito (impostazione predefinita di Checkout): alla fine della prova l'addebito parte da solo.
    // Il regalo dell'annuale Premium viaggia nei metadati e arriva col primo incasso (grantInvoiceTokens).
    subscription_data: {
      metadata: promo?.giftHomeDays ? { ...metadata, giftHomeDays: String(promo.giftHomeDays) } : metadata,
      default_tax_rates: await taxRates(),
      ...(past ? {} : { trial_period_days: TRIAL_DAYS }),
    },
    success_url: `${appUrl()}/api/stripe/ritorno?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/area-partner/abbonamento`,
  });
  if (!session.url) throw new Error("Stripe non ha restituito l'indirizzo del Checkout");
  return session.url;
}

/** Customer Portal: metodo di pagamento, fatture, cambio piano, disdetta. */
export async function createPortalSession(partnerId: string): Promise<string> {
  const [p] = await db.select({ customer: partners.stripeCustomerId }).from(partners).where(eq(partners.id, partnerId));
  if (!p?.customer) throw new BillingError("Nessun pagamento ancora registrato con Stripe");
  const session = await stripe().billingPortal.sessions.create({
    customer: p.customer,
    locale: "it",
    return_url: `${appUrl()}/area-partner/abbonamento`,
    ...(await portalConfiguration()),
  });
  return session.url;
}

/** Configurazione del portale creata da `npm run stripe:setup` (metadato geco=portale); altrimenti quella predefinita. */
async function portalConfiguration(): Promise<{ configuration?: string }> {
  const id = (await stripe().billingPortal.configurations.list({ active: true, limit: 100 })).data.find((c) => c.metadata?.geco === "portale")?.id;
  return id ? { configuration: id } : {};
}

/**
 * Cambio piano o periodo durante l'abbonamento: apre la pagina di conferma del portale Stripe, che mostra l'importo.
 * Regole nel portale (stripe:setup): salendo di piano si paga subito la differenza per i giorni che restano,
 * scendendo il cambio vale dal prossimo rinnovo. Il webhook allinea poi il piano nel database.
 */
export async function createPlanChangeSession(partnerId: string, planCode: string, period: "monthly" | "yearly"): Promise<string> {
  const [row] = await db
    .select({
      customer: partners.stripeCustomerId,
      subscriptionId: subscriptions.stripeSubscriptionId,
      currentListCents: sql<number>`case when ${subscriptions.period} = 'yearly' then ${plans.yearlyPriceCents} else ${plans.monthlyPriceCents} end`,
    })
    .from(subscriptions)
    .innerJoin(partners, eq(partners.id, subscriptions.partnerId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(eq(subscriptions.partnerId, partnerId), eq(subscriptions.status, "active"), isNotNull(subscriptions.stripeSubscriptionId)));
  if (!row?.customer || !row.subscriptionId) throw new BillingError("Nessun abbonamento attivo da cambiare");
  const [plan] = await db.select().from(plans).where(eq(plans.code, planCode));
  if (!plan) throw new BillingError("Piano non valido");
  const price = await planPrice(plan, period);
  if (!price) throw new BillingError("Il piano non è ancora collegato a Stripe (npm run stripe:setup)");
  const item = (await stripe().subscriptions.retrieve(row.subscriptionId)).items.data[0];
  if (!item) throw new Error(`Abbonamento Stripe ${row.subscriptionId} senza voci`);
  if (item.price.id === price) throw new BillingError("È già il tuo piano");
  const targetListCents = period === "yearly" ? plan.yearlyPriceCents : plan.monthlyPriceCents;
  const promo = changePromo(row.currentListCents, targetListCents, planPromo(plan, period, new Date(), launchDate()), await changePromoUsed(partnerId));
  if (promo) {
    await changePlanWithPromo(partnerId, row.subscriptionId, item.id, price, plan.code, period, promo);
    return `${appUrl()}/area-partner/abbonamento?pagamento=cambio`;
  }
  const session = await stripe().billingPortal.sessions.create({
    customer: row.customer,
    locale: "it",
    return_url: `${appUrl()}/area-partner/abbonamento`,
    ...(await portalConfiguration()),
    flow_data: {
      type: "subscription_update_confirm",
      subscription_update_confirm: { subscription: row.subscriptionId, items: [{ id: item.id, price, quantity: 1 }] },
      after_completion: { type: "redirect", redirect: { return_url: `${appUrl()}/area-partner/abbonamento?pagamento=cambio` } },
    },
  });
  return session.url;
}

const changePromoKey = (partnerId: string) => `change-promo:${partnerId}`;

/** L'azienda ha già avuto la promo in un cambio piano. */
export async function changePromoUsed(partnerId: string): Promise<boolean> {
  const [row] = await db.select({ key: stripeProcessed.key }).from(stripeProcessed).where(eq(stripeProcessed.key, changePromoKey(partnerId)));
  return Boolean(row);
}

/**
 * Cambio piano con la promo, senza passare dal portale (che non sa applicare lo sconto come sulle schede).
 * In prova: cambia il prezzo e lo sconto vale sul primo pagamento, come per un abbonamento nuovo. Già pagante: il nuovo
 * periodo parte oggi, si paga subito il prezzo promo meno i giorni non usati del piano di prima; se la carta non passa
 * Stripe rifiuta il cambio e resta tutto com'era.
 */
async function changePlanWithPromo(
  partnerId: string,
  subscriptionId: string,
  itemId: string,
  price: string,
  planCode: string,
  period: "monthly" | "yearly",
  promo: PlanPromo,
): Promise<void> {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const trialing = sub.status === "trialing";
  const metadata = promo.giftHomeDays ? { ...sub.metadata, giftHomeDays: String(promo.giftHomeDays) } : sub.metadata;
  const params: Stripe.SubscriptionUpdateParams = {
    items: [{ id: itemId, price, quantity: 1 }],
    metadata,
    discounts: [{ coupon: await promoCoupon(planCode, period, promo.listCents - promo.payNowCents, trialing ? "repeating" : "once") }],
    proration_behavior: trialing ? "none" : "create_prorations",
    expand: ["latest_invoice"],
  };
  if (!trialing) Object.assign(params, { billing_cycle_anchor: { type: "now" }, payment_behavior: "error_if_incomplete" });
  const updated = await stripe()
    .subscriptions.update(subscriptionId, params)
    .catch((err) => {
      if (err instanceof Stripe.errors.StripeCardError) throw new BillingError("Pagamento non riuscito: controlla la carta in Gestisci pagamenti e riprova");
      throw err;
    });
  await db.insert(stripeProcessed).values({ key: changePromoKey(partnerId) }).onConflictDoNothing();
  // Effetti subito, senza aspettare il webhook (che li ripete senza doppioni).
  await syncSubscription(subscriptionId);
  if (!trialing && updated.latest_invoice && typeof updated.latest_invoice !== "string") await grantInvoiceTokens(updated.latest_invoice);
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

/** Checkout concluso: abbonamento allineato, crediti nel registro o logo in Home per i pacchetti pagati (una volta sola). */
async function applyCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const subscriptionId = idOf(session.subscription);
  if (subscriptionId) await syncSubscription(subscriptionId);
  const boost = searchBoostFromCheckout(session);
  if (boost) {
    await db.transaction(async (tx) => {
      if (!(await firstTime(tx, `checkout:${session.id}`))) return;
      await grantSearchBoost(tx, boost.partnerId, boost.hours);
    });
    revalidateTag("boosts", { expire: 0 });
    return;
  }
  const extension = areaExtensionFromCheckout(session);
  if (extension) {
    await db.transaction(async (tx) => {
      if (!(await firstTime(tx, `checkout:${session.id}`))) return;
      await grantAreaExtensions(tx, extension.partnerId, extension.municipalityIds, AREA_EXTENSION_OFFER.days);
    });
    // I risultati della ricerca sono in cache: l'azienda compare subito nei nuovi comuni.
    revalidateTag("boosts", { expire: 0 });
    return;
  }
  const sponsor = homeSponsorFromCheckout(session);
  if (sponsor) {
    await db.transaction(async (tx) => {
      if (!(await firstTime(tx, `checkout:${session.id}`))) return;
      await grantHomeSponsor(tx, sponsor.partnerId, sponsor.days);
    });
    // La fascia loghi della Home è in cache: il logo compare subito.
    revalidateTag("boosts", { expire: 0 });
    return;
  }
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
}

/** Periodo pagato: arrivano i crediti del piano (la prima quota mensile; le altre dell'annuale dal cron mensile). */
async function grantInvoiceTokens(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);
  // La fattura a 0 € della prova gratuita non porta crediti: arrivano col primo pagamento vero.
  // Il cambio piano in promo (fattura "subscription_update") porta solo il regalo, non i crediti del rinnovo.
  const renewal = grantsRenewalTokens(invoice.billing_reason);
  if (invoice.status !== "paid" || !subscriptionId || !(renewal || invoice.billing_reason === "subscription_update") || invoice.amount_paid <= 0) return;
  const synced = await syncSubscription(subscriptionId);
  if (!synced) return;
  const now = new Date();
  const giftDays = Number(invoice.parent?.subscription_details?.metadata?.giftHomeDays ?? 0);
  await db.transaction(async (tx) => {
    if (!(await firstTime(tx, `invoice:${invoice.id}`))) return;
    // Annuale Premium in promo: logo in Home in regalo col primo incasso, una volta sola per abbonamento.
    if (giftDays > 0 && (await firstTime(tx, `gift:${subscriptionId}`))) await grantHomeSponsor(tx, synced.partnerId, giftDays, now);
    if (!renewal) return;
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
  // La fascia loghi della Home è in cache: il logo in regalo compare subito.
  if (giftDays > 0) revalidateTag("boosts", { expire: 0 });
}

/**
 * Ritorno dal Checkout: rilegge la sessione da Stripe e ne applica gli effetti subito, senza aspettare il
 * webhook (che in locale senza Stripe CLI non arriva). Gli effetti sono gli stessi del webhook e idempotenti:
 * se arrivano entrambi, i crediti si accreditano una volta. Ignora le sessioni di un altro partner.
 */
export async function confirmCheckoutReturn(
  sessionId: string,
  partnerId: string,
): Promise<{ kind: "tokens" | "subscription" | "home_sponsor" | "area_extension" | "search_boost"; confirmed: boolean } | null> {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const kind = session.metadata?.kind;
  if (session.metadata?.partnerId !== partnerId || (kind !== "tokens" && kind !== "subscription" && kind !== "home_sponsor" && kind !== "area_extension" && kind !== "search_boost")) return null;
  // Con l'addebito SEPA la sessione è completa ma l'incasso arriva giorni dopo (webhook async_payment_succeeded).
  const confirmed = session.status === "complete" && session.payment_status !== "unpaid";
  if (!confirmed) return { kind, confirmed };
  await applyCheckoutSession(session);
  const invoiceId = idOf(session.invoice);
  if (invoiceId) await grantInvoiceTokens(await stripe().invoices.retrieve(invoiceId));
  return { kind, confirmed };
}

/** Effetti di un evento webhook già verificato. Ogni effetto è idempotente. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await applyCheckoutSession(event.data.object);
      return;

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscription(event.data.object.id);
      return;

    case "invoice.paid":
      await grantInvoiceTokens(event.data.object);
      return;

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
