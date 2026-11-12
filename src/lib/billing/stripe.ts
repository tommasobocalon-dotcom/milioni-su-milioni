import "server-only";
import { revalidateTag } from "next/cache";
import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db/client";
import { municipalities, partners, plans, stripeProcessed, subscriptions } from "@/lib/db/schema";
import { accountStatusFrom, areaExtensionFromCheckout, homeSponsorFromCheckout, searchBoostFromCheckout, periodFromItems, planFromLookupKey, planLookupKey, subscriptionStatusFromStripe, TRIAL_DAYS } from "@/lib/domain/billing";
import { AREA_EXTENSION_OFFER, changePromo, HOME_SPONSOR_PACKAGES, homeSponsorPrice, launchDate, municipalityIdsFrom, planPromo, type PlanPromo, SEARCH_BOOST_PACKAGES } from "@/lib/domain/offers";
import { grantAreaExtensions, grantHomeSponsor, grantSearchBoost } from "@/lib/leads/service";

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
    cancel_url: `${appUrl()}/area-partner/sponsorizzazioni#${p.back}`,
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
    cancel_url: `${appUrl()}/area-partner/sponsorizzazioni#estensione`,
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
  // Anche Stripe, non solo il database: se il webhook non è ancora arrivato un secondo Checkout creava un secondo
  // abbonamento e un doppio addebito (successo a un'azienda di prova il 5/11/2026).
  const customer = await customerFor(payer);
  const live = await stripe().subscriptions.list({ customer, status: "all", limit: 20 });
  if (live.data.some((s) => ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(s.status)))
    throw new BillingError("Hai già un abbonamento: cambia piano o metodo di pagamento dal portale");
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
    customer,
    locale: "it",
    allowed_payment_method_types: PAYMENT_METHODS,
    line_items: [{ price, quantity: 1 }],
    metadata,
    ...(promo ? { discounts: [{ coupon: await promoCoupon(plan.code, period, promo.listCents - promo.payNowCents) }] } : {}),
    // Carta chiesta subito (impostazione predefinita di Checkout): alla fine della prova l'addebito parte da solo.
    // Il regalo dell'annuale Premium viaggia nei metadati e arriva col primo incasso (grantInvoiceGift).
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
 * scendendo il cambio vale dal prossimo rinnovo. Con la promo ancora da usare (salendo o scendendo) il cambio è
 * invece immediato, con `changePlanWithPromo`. Il webhook allinea poi il piano nel database.
 */
export async function createPlanChangeSession(partnerId: string, planCode: string, period: "monthly" | "yearly"): Promise<string> {
  const [row] = await db
    .select({
      customer: partners.stripeCustomerId,
      subscriptionId: subscriptions.stripeSubscriptionId,
    })
    .from(subscriptions)
    .innerJoin(partners, eq(partners.id, subscriptions.partnerId))
    .where(and(eq(subscriptions.partnerId, partnerId), eq(subscriptions.status, "active"), isNotNull(subscriptions.stripeSubscriptionId)));
  if (!row?.customer || !row.subscriptionId) throw new BillingError("Nessun abbonamento attivo da cambiare");
  const [plan] = await db.select().from(plans).where(eq(plans.code, planCode));
  if (!plan) throw new BillingError("Piano non valido");
  const price = await planPrice(plan, period);
  if (!price) throw new BillingError("Il piano non è ancora collegato a Stripe (npm run stripe:setup)");
  const current = await stripe().subscriptions.retrieve(row.subscriptionId);
  // Una discesa già programmata (piano di Stripe) bloccherebbe il cambio o lo annullerebbe al rinnovo: si toglie,
  // vale il cambio di adesso. Senza, chi scendeva e poi risaliva in promo tornava giù al rinnovo (12/11/2026).
  if (current.schedule) await stripe().subscriptionSchedules.release(typeof current.schedule === "string" ? current.schedule : current.schedule.id);
  const item = current.items.data[0];
  if (!item) throw new Error(`Abbonamento Stripe ${row.subscriptionId} senza voci`);
  if (item.price.id === price) throw new BillingError("È già il tuo piano");
  const promo = changePromo(planPromo(plan, period, new Date(), launchDate()), await changePromoUsed(partnerId));
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
 * Cambio di piano già programmato in Stripe (discesa dal prossimo rinnovo, scelta nel portale): piano e data in cui
 * parte, o null. Il database lo scopre solo al rinnovo, così la pagina abbonamento lo dice prima.
 */
export async function pendingPlanChange(subscriptionId: string): Promise<{ planCode: string; period: "monthly" | "yearly"; from: Date } | null> {
  const sub = await stripe().subscriptions.retrieve(subscriptionId, { expand: ["schedule.phases.items.price"] });
  if (!sub.schedule || typeof sub.schedule === "string") return null;
  const next = sub.schedule.phases.find((ph) => ph.start_date * 1000 > Date.now());
  const price = next?.items[0]?.price;
  const plan = price && typeof price !== "string" && "lookup_key" in price ? planFromLookupKey(price.lookup_key) : null;
  return next && plan ? { planCode: plan.code, period: plan.period, from: new Date(next.start_date * 1000) } : null;
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
  if (!trialing && updated.latest_invoice && typeof updated.latest_invoice !== "string") await grantInvoiceGift(updated.latest_invoice);
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

/** Checkout concluso: abbonamento allineato o pacchetto pagato applicato (una volta sola). */
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
  // Le sessioni senza effetto da applicare (abbonamento già allineato sopra) finiscono qui.
}

/** Annuale Premium in promo: logo in Home in regalo col primo incasso (anche da cambio piano), una volta sola per abbonamento. */
async function grantInvoiceGift(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);
  const giftDays = Number(invoice.parent?.subscription_details?.metadata?.giftHomeDays ?? 0);
  // La fattura a 0 € della prova gratuita non conta: il regalo arriva col primo pagamento vero.
  const paidPeriod = ["subscription_create", "subscription_cycle", "subscription_update"].includes(invoice.billing_reason ?? "");
  if (invoice.status !== "paid" || !subscriptionId || !paidPeriod || invoice.amount_paid <= 0 || giftDays <= 0) return;
  const synced = await syncSubscription(subscriptionId);
  if (!synced) return;
  await db.transaction(async (tx) => {
    if (!(await firstTime(tx, `invoice:${invoice.id}`))) return;
    if (await firstTime(tx, `gift:${subscriptionId}`)) await grantHomeSponsor(tx, synced.partnerId, giftDays, new Date());
  });
  // La fascia loghi della Home è in cache: il logo in regalo compare subito.
  revalidateTag("boosts", { expire: 0 });
}

/**
 * Ritorno dal Checkout: rilegge la sessione da Stripe e ne applica gli effetti subito, senza aspettare il
 * webhook (che in locale senza Stripe CLI non arriva). Gli effetti sono gli stessi del webhook e idempotenti:
 * se arrivano entrambi, gli effetti si applicano una volta. Ignora le sessioni di un altro partner.
 */
export async function confirmCheckoutReturn(
  sessionId: string,
  partnerId: string,
): Promise<{ kind: "subscription" | "home_sponsor" | "area_extension" | "search_boost"; confirmed: boolean } | null> {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const kind = session.metadata?.kind;
  if (session.metadata?.partnerId !== partnerId || (kind !== "subscription" && kind !== "home_sponsor" && kind !== "area_extension" && kind !== "search_boost")) return null;
  // Con l'addebito SEPA la sessione è completa ma l'incasso arriva giorni dopo (webhook async_payment_succeeded).
  const confirmed = session.status === "complete" && session.payment_status !== "unpaid";
  if (!confirmed) return { kind, confirmed };
  await applyCheckoutSession(session);
  const invoiceId = idOf(session.invoice);
  if (invoiceId) await grantInvoiceGift(await stripe().invoices.retrieve(invoiceId));
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
      await grantInvoiceGift(event.data.object);
      return;

    default:
      return;
  }
}
