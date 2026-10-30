"use server";

import { and, eq, isNotNull, max } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePartner } from "@/lib/auth/session";
import { googlePlacesEnabled, searchGooglePlaces } from "@/lib/google/places";
import type { GooglePlaceMatch } from "@/lib/domain/google-reviews";
import { ipRateLimited } from "@/lib/security/ip-limit";
import { putImage } from "@/lib/storage";
import { BillingError, createPortalSession, createSubscriptionCheckout, createTokenCheckout, stripeConfigured } from "@/lib/billing/stripe";
import { db } from "@/lib/db/client";
import { auditLogs, leadEvents, leads, partners, partnerServices, plans, portfolioItems, priceUnit, subscriptions, tokenLedger, users } from "@/lib/db/schema";
import { getListableServices, getPriceList, getSubscription } from "@/lib/data/partner-area";
import { demoMode } from "@/lib/demo-mode";
import { parseAmount } from "@/lib/domain/format";
import { canReportLead, REPORT_REASONS } from "@/lib/domain/lead-rules";
import { TOKEN_PACKAGES } from "@/lib/domain/offers";
import { tokenExpiryFrom } from "@/lib/domain/tokens";
import { activateBoost, BoostNotActivatableError, LeadNotUnlockableError, unlockLead } from "@/lib/leads/service";
import { LEAD_STATUSES, statusInfo } from "@/lib/leads/status";
import { MESSAGE_MAX, TICKET_TOPICS } from "@/lib/domain/support";
import { openTicket, replyFromPartner } from "@/lib/support/service";

const Id = z.uuid();

/** Il lead deve appartenere al partner della sessione ed essere stato consegnato. */
async function ownLead(partnerId: string, leadId: string) {
  if (!Id.safeParse(leadId).success) return null;
  const [lead] = await db
    .select({ id: leads.id, status: leads.status, deliveredAt: leads.deliveredAt, reportStatus: leads.reportStatus, charge: leads.charge })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.partnerId, partnerId), isNotNull(leads.deliveredAt)));
  return lead ?? null;
}

export async function markLeadSeen(leadId: string) {
  const { user, partner } = await requirePartner();
  const lead = await ownLead(partner.id, leadId);
  if (!lead || lead.status !== "new") return;
  await db.update(leads).set({ status: "seen" }).where(eq(leads.id, lead.id));
  await db.insert(leadEvents).values({ leadId: lead.id, type: "seen", message: `Lead aperto da ${user.name}`, actor: user.name });
  revalidatePath("/area-partner", "layout");
}

const StatusSchema = z.enum(LEAD_STATUSES.map((s) => s.value) as [string, ...string[]]);

export async function updateLeadStatus(leadId: string, formData: FormData) {
  const { user, partner } = await requirePartner();
  const status = StatusSchema.safeParse(formData.get("status"));
  const lead = await ownLead(partner.id, leadId);
  if (!lead || !status.success || lead.charge === "locked") return;
  if (lead.status === status.data) return;
  await db.update(leads).set({ status: status.data as (typeof LEAD_STATUSES)[number]["value"] }).where(eq(leads.id, lead.id));
  await db.insert(leadEvents).values({
    leadId: lead.id,
    type: "status",
    message: `Stato cambiato in "${statusInfo(status.data).label}"`,
    actor: user.name,
  });
  revalidatePath("/area-partner", "layout");
}

export async function saveLeadNotes(leadId: string, formData: FormData) {
  const { partner } = await requirePartner();
  const notes = z.string().max(2000).safeParse(String(formData.get("notes") ?? "").trim());
  const lead = await ownLead(partner.id, leadId);
  if (!lead || !notes.success) return;
  await db.update(leads).set({ notes: notes.data || null }).where(eq(leads.id, lead.id));
  revalidatePath(`/area-partner/lead/${lead.id}`);
}

export type ReportState = { ok?: boolean; error?: string };

export async function reportLead(leadId: string, _prev: ReportState, formData: FormData): Promise<ReportState> {
  const { user, partner } = await requirePartner();
  const reason = REPORT_REASONS.find((r) => r.value === formData.get("reason"));
  const lead = await ownLead(partner.id, leadId);
  if (!lead) return { error: "Lead non trovato" };
  if (!reason) return { error: "Scegli un motivo tra quelli previsti" };
  if (lead.reportStatus) return { error: "Hai già segnalato questo lead" };
  const now = new Date();
  if (!canReportLead(lead.deliveredAt, now)) return { error: "Sono passate più di 72 ore dalla consegna: non è più possibile segnalarlo" };
  await db.update(leads).set({ reportReason: reason.value, reportStatus: "open", reportedAt: now }).where(eq(leads.id, lead.id));
  await db.insert(leadEvents).values({ leadId: lead.id, type: "reported", message: `Segnalato: ${reason.label}`, actor: user.name, createdAt: now });
  await db.insert(auditLogs).values({ actor: user.email, action: "lead.report", entity: "lead", entityId: lead.id, data: { reason: reason.value } });
  revalidatePath(`/area-partner/lead/${lead.id}`);
  return { ok: true };
}

export type UnlockState = { error?: string };

export async function unlockLeadAction(leadId: string): Promise<UnlockState> {
  const { user, partner } = await requirePartner();
  if (!Id.safeParse(leadId).success) return { error: "Lead non valido" };
  try {
    await unlockLead(partner.id, leadId, user.name);
  } catch (e) {
    if (e instanceof LeadNotUnlockableError) return { error: e.message };
    throw e;
  }
  revalidatePath("/area-partner", "layout");
  return {};
}

/**
 * Solo in sviluppo e sul sito di prova: accredita un pacchetto senza pagamento, per provare il flusso
 * dei token. In produzione l'accredito arriva dal webhook Stripe checkout.session.completed.
 */
export async function simulateTokenPurchase(code: string) {
  if (!demoMode()) return;
  const { user, partner } = await requirePartner();
  const pkg = TOKEN_PACKAGES.find((p) => p.code === code);
  if (!pkg) return;
  const now = new Date();
  await db.insert(tokenLedger).values({
    partnerId: partner.id,
    kind: "purchase",
    amount: pkg.tokens,
    expiresAt: tokenExpiryFrom(now),
    reference: `Pacchetto ${pkg.name} (acquisto di prova)`,
    createdAt: now,
  });
  await db.insert(auditLogs).values({ actor: user.email, action: "tokens.simulated_purchase", entity: "partner", entityId: partner.id, data: { code } });
  revalidatePath("/area-partner", "layout");
}

export async function setAutoUseTokens(formData: FormData) {
  const { partner, memberRole } = await requirePartner();
  if (memberRole !== "owner") return;
  const on = formData.get("auto") === "on";
  await db.update(subscriptions).set({ autoUseTokens: on }).where(eq(subscriptions.partnerId, partner.id));
  revalidatePath("/area-partner", "layout");
}

export type ActionState = { error?: string; ok?: string };

export async function activateBoostAction(days: number): Promise<ActionState> {
  const { user, partner } = await requirePartner();
  try {
    const { endsAt } = await activateBoost(partner.id, days);
    await db.insert(auditLogs).values({ actor: user.email, action: "boost.activated", entity: "partner", entityId: partner.id, data: { days } });
    revalidatePath("/area-partner", "layout");
    return { ok: `Boost attivo fino al ${endsAt.toLocaleDateString("it-IT")}` };
  } catch (e) {
    if (e instanceof BoostNotActivatableError) return { error: e.message };
    throw e;
  }
}

const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

const ProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Scrivi il nome").max(60),
  lastName: z.string().trim().min(1, "Scrivi il cognome").max(60),
  businessName: z.string().trim().min(2, "Scrivi la ragione sociale").max(160),
  vatNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/^IT/i, "").replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{11}$/, "La partita IVA ha 11 cifre")),
  address: z.string().trim().min(5, "Scrivi l'indirizzo della sede legale").max(200),
  tagline: z.string().trim().min(3, "Scrivi una frase di presentazione").max(120),
  description: z.string().trim().min(20, "La descrizione deve avere almeno 20 caratteri").max(2000),
  phone: z.string().trim().max(30).optional(),
  email: z.union([z.literal(""), z.email("Email non valida")]).optional(),
});

/** Riconosce il formato dai primi byte del file: il tipo dichiarato dal browser non basta. */
async function sniffImage(file: File): Promise<"jpg" | "png" | "webp" | null> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "webp";
  return null;
}

/**
 * Valida e salva un'immagine caricata. Nessun file: null; file non valido: messaggio d'errore.
 * ponytail: disco locale in public/uploads; in produzione Supabase Storage (su Vercel il disco è di sola lettura).
 */
async function saveImage(folder: "partners" | "avatars" | "portfolio", partnerId: string, file: FormDataEntryValue | null): Promise<{ url: string } | { error: string } | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > IMAGE_MAX_BYTES) return { error: "La foto può pesare al massimo 2 MB" };
  const ext = await sniffImage(file);
  if (!ext) return { error: "La foto deve essere JPG, PNG o WebP" };
  const key = `${folder}/${partnerId}-${randomUUID()}.${ext}`;
  return putImage(key, Buffer.from(await file.arrayBuffer()), ext);
}

/** Profilo: dati della persona (nome, foto) e dell'azienda (logo, dati fiscali, sede, presentazione). */
export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, partner, memberRole } = await requirePartner();
  const field = (k: string) => formData.get(k) ?? undefined;
  const parsed = ProfileSchema.safeParse(
    Object.fromEntries(["firstName", "lastName", "businessName", "vatNumber", "address", "tagline", "description", "phone", "email"].map((k) => [k, field(k)])),
  );
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const logo = await saveImage("partners", partner.id, formData.get("logo"));
  if (logo && "error" in logo) return logo;
  const avatar = await saveImage("avatars", user.id, formData.get("avatar"));
  if (avatar && "error" in avatar) return avatar;

  const d = parsed.data;
  // Ragione sociale e partita IVA finiscono in fattura: le cambia solo il titolare dell'account.
  const fiscal = memberRole === "owner" ? { businessName: d.businessName, vatNumber: d.vatNumber } : {};
  await db.transaction(async (tx) => {
    await tx
      .update(partners)
      .set({
        ...fiscal,
        address: d.address,
        tagline: d.tagline,
        description: d.description,
        phone: d.phone || null,
        email: d.email || null,
        ...(logo && { logoUrl: logo.url }),
      })
      .where(eq(partners.id, partner.id));
    await tx
      .update(users)
      .set({ name: `${d.firstName} ${d.lastName}`, ...(avatar && { avatarUrl: avatar.url }) })
      .where(eq(users.id, user.id));
    await tx.insert(auditLogs).values({
      actor: user.email,
      action: "partner.profile_updated",
      entity: "partner",
      entityId: partner.id,
      data: { logo: !!logo, avatar: !!avatar, fiscal: memberRole === "owner" },
    });
  });
  updateTag(`partner:${partner.slug}`);
  revalidatePath("/area-partner", "layout");
  return { ok: "Profilo aggiornato" };
}

const optionalInt = (limit: number) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(0).max(limit).optional());

const PortfolioSchema = z.object({
  title: z.string().trim().min(3, "Dai un titolo all'elemento").max(120),
  description: z.string().trim().max(1000).optional(),
  municipalityId: optionalInt(1_000_000),
  // Solo immobili (agenzie)
  contract: z.enum(["sale", "rent"]).optional(),
  priceEuro: optionalInt(100_000_000),
  sqm: optionalInt(100_000),
  rooms: optionalInt(100),
  hasBeforeAfter: z.literal("on").optional(),
});

/** Agenzie: immobili. Tutti gli altri: lavori svolti. Il tipo arriva dal partner, non dal form. */
export async function addPortfolioItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { partner } = await requirePartner();
  const parsed = PortfolioSchema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const isProperty = partner.type === "agency";
  if (isProperty && !d.contract) return { error: "Scegli vendita o affitto" };

  const image = await saveImage("portfolio", partner.id, formData.get("image"));
  if (image && "error" in image) return image;

  const [{ last }] = await db.select({ last: max(portfolioItems.sortOrder) }).from(portfolioItems).where(eq(portfolioItems.partnerId, partner.id));
  await db.insert(portfolioItems).values({
    partnerId: partner.id,
    kind: isProperty ? "property" : "work",
    title: d.title,
    description: d.description || null,
    municipalityId: d.municipalityId ?? null,
    contract: isProperty ? d.contract : null,
    priceCents: isProperty && d.priceEuro !== undefined ? d.priceEuro * 100 : null,
    sqm: isProperty ? (d.sqm ?? null) : null,
    rooms: isProperty ? (d.rooms ?? null) : null,
    status: isProperty ? "available" : null,
    hasBeforeAfter: !isProperty && d.hasBeforeAfter === "on",
    imageUrl: image?.url ?? null,
    sortOrder: (last ?? -1) + 1,
  });
  updateTag(`partner:${partner.slug}`);
  revalidatePath("/area-partner/scheda");
  return { ok: "Aggiunto al portfolio" };
}

const PropertyStatusSchema = z.enum(["available", "negotiating", "sold"]);

export async function setPortfolioStatus(itemId: string, formData: FormData) {
  const { partner } = await requirePartner();
  const status = PropertyStatusSchema.safeParse(formData.get("status"));
  if (!Id.safeParse(itemId).success || !status.success) return;
  await db
    .update(portfolioItems)
    .set({ status: status.data })
    .where(and(eq(portfolioItems.id, itemId), eq(portfolioItems.partnerId, partner.id), eq(portfolioItems.kind, "property")));
  updateTag(`partner:${partner.slug}`);
  revalidatePath("/area-partner/scheda");
}

export async function deletePortfolioItem(itemId: string) {
  const { partner } = await requirePartner();
  if (!Id.safeParse(itemId).success) return;
  await db.delete(portfolioItems).where(and(eq(portfolioItems.id, itemId), eq(portfolioItems.partnerId, partner.id)));
  updateTag(`partner:${partner.slug}`);
  revalidatePath("/area-partner/scheda");
}

const PriceItemSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]).optional(),
  serviceId: z.uuid("Scegli un servizio"),
  unit: z.enum(priceUnit.enumValues, "Scegli l'unità di prezzo"),
  notes: z.string().trim().max(160, "Le note possono avere al massimo 160 caratteri").optional(),
});

/** Aggiunge o modifica una voce del listino. Il servizio deve essere della categoria del partner. */
export async function savePriceItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, partner } = await requirePartner();
  const parsed = PriceItemSchema.safeParse({
    id: formData.get("id") ?? undefined,
    serviceId: formData.get("serviceId"),
    unit: formData.get("unit"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const priceFrom = parseAmount(String(formData.get("priceFrom") ?? ""));
  const priceTo = parseAmount(String(formData.get("priceTo") ?? ""));
  if (Number.isNaN(priceFrom) || Number.isNaN(priceTo)) return { error: "Scrivi i prezzi come numeri, ad esempio 1.200 o 32,50" };
  if (priceFrom !== null && priceTo !== null && priceTo < priceFrom) return { error: "Il prezzo massimo non può essere più basso del minimo" };
  if (priceFrom !== null && priceFrom > 1_000_000_000) return { error: "Importo troppo alto" };
  if (priceTo !== null && priceTo > 1_000_000_000) return { error: "Importo troppo alto" };

  const d = parsed.data;
  const [allowed, rows, sub] = await Promise.all([getListableServices(partner.id), getPriceList(partner.id), getSubscription(partner.id)]);
  if (!allowed.some((s) => s.id === d.serviceId)) return { error: "Servizio non disponibile per la tua categoria" };
  const editing = d.id ? rows.find((r) => r.id === d.id) : undefined;
  if (d.id && !editing) return { error: "Voce del listino non trovata" };
  if (rows.some((r) => r.serviceId === d.serviceId && r.id !== d.id)) return { error: "Questo servizio è già nel listino: modifica la voce esistente" };
  if (!editing && sub?.maxServices && rows.length >= sub.maxServices) {
    return { error: `Il piano ${sub.planName} permette fino a ${sub.maxServices} servizi nel listino` };
  }

  const values = { serviceId: d.serviceId, unit: d.unit, priceFrom, priceTo, notes: d.notes || null };
  if (editing) {
    await db.update(partnerServices).set(values).where(and(eq(partnerServices.id, editing.id), eq(partnerServices.partnerId, partner.id)));
  } else {
    const [{ last }] = await db.select({ last: max(partnerServices.sortOrder) }).from(partnerServices).where(eq(partnerServices.partnerId, partner.id));
    await db.insert(partnerServices).values({ ...values, partnerId: partner.id, sortOrder: (last ?? -1) + 1 });
  }
  await db.insert(auditLogs).values({
    actor: user.email,
    action: editing ? "price_list.updated" : "price_list.added",
    entity: "partner",
    entityId: partner.id,
    data: { serviceId: d.serviceId, priceFrom, priceTo, unit: d.unit },
  });
  updateTag(`partner:${partner.slug}`);
  revalidatePath("/area-partner", "layout");
  return { ok: editing ? "Prezzo aggiornato" : "Servizio aggiunto al listino" };
}

export async function deletePriceItem(itemId: string) {
  const { user, partner } = await requirePartner();
  if (!Id.safeParse(itemId).success) return;
  const removed = await db
    .delete(partnerServices)
    .where(and(eq(partnerServices.id, itemId), eq(partnerServices.partnerId, partner.id)))
    .returning({ serviceId: partnerServices.serviceId });
  if (removed.length === 0) return;
  await db.insert(auditLogs).values({ actor: user.email, action: "price_list.removed", entity: "partner", entityId: partner.id, data: removed[0] });
  updateTag(`partner:${partner.slug}`);
  revalidatePath("/area-partner", "layout");
}

/** Sposta una voce di un posto in su o in giù: l'ordine è quello mostrato sul profilo pubblico. */
export async function movePriceItem(itemId: string, direction: "up" | "down") {
  const { partner } = await requirePartner();
  const rows = await getPriceList(partner.id);
  const i = rows.findIndex((r) => r.id === itemId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await db.transaction(async (tx) => {
    for (const [order, r] of rows.entries()) {
      await tx.update(partnerServices).set({ sortOrder: order }).where(and(eq(partnerServices.id, r.id), eq(partnerServices.partnerId, partner.id)));
    }
  });
  updateTag(`partner:${partner.slug}`);
  revalidatePath("/area-partner/listino");
}

export type CheckoutState = { url?: string; error?: string };

/** Pagamenti e portale Stripe: solo il titolare dell'account. L'esito arriva dal webhook, non da qui. */
async function billingAction(run: (payer: { partnerId: string; email: string; name: string }) => Promise<string>, action: string): Promise<CheckoutState> {
  const { user, partner, memberRole } = await requirePartner();
  if (memberRole !== "owner") return { error: "Solo il titolare dell'account può gestire i pagamenti" };
  if (!stripeConfigured()) return { error: "I pagamenti online non sono ancora attivi" };
  try {
    const url = await run({ partnerId: partner.id, email: user.email, name: user.name });
    await db.insert(auditLogs).values({ actor: user.email, action, entity: "partner", entityId: partner.id });
    return { url };
  } catch (e) {
    if (e instanceof BillingError) return { error: e.message };
    console.error("[stripe]", action, e);
    return { error: "Stripe non risponde, riprova tra poco" };
  }
}

export async function startTokenCheckout(code: string): Promise<CheckoutState> {
  return billingAction((payer) => createTokenCheckout(payer, code), "billing.token_checkout");
}

export async function startSubscriptionCheckout(planCode: string, period: "monthly" | "yearly"): Promise<CheckoutState> {
  if (period !== "monthly" && period !== "yearly") return { error: "Periodo non valido" };
  return billingAction((payer) => createSubscriptionCheckout(payer, planCode, period), "billing.subscription_checkout");
}

export async function openBillingPortal(): Promise<CheckoutState> {
  return billingAction((payer) => createPortalSession(payer.partnerId), "billing.portal");
}

/**
 * Solo in sviluppo e sul sito di prova, senza Stripe: attiva il piano senza pagamento, per provare il
 * percorso di registrazione. In produzione l'abbonamento nasce dal webhook di Stripe.
 */
export async function simulateSubscription(planCode: string, period: "monthly" | "yearly") {
  if (!demoMode() || stripeConfigured()) return;
  const { user, partner, memberRole } = await requirePartner();
  if (memberRole !== "owner" || (period !== "monthly" && period !== "yearly")) return;
  const [plan] = await db.select({ id: plans.id, name: plans.name, renewalTokens: plans.renewalTokens }).from(plans).where(eq(plans.code, planCode));
  if (!plan) return;
  const start = new Date();
  const end = new Date(start);
  if (period === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  await db.transaction(async (tx) => {
    await tx.update(subscriptions).set({ status: "cancelled" }).where(eq(subscriptions.partnerId, partner.id));
    await tx.insert(subscriptions).values({ partnerId: partner.id, planId: plan.id, period, status: "active", currentPeriodStart: start, currentPeriodEnd: end });
    await tx.update(partners).set({ accountStatus: "active" }).where(eq(partners.id, partner.id));
    // Come il webhook Stripe a ogni periodo pagato: token omaggio del piano.
    if (plan.renewalTokens > 0) {
      await tx.insert(tokenLedger).values({
        partnerId: partner.id,
        kind: "credit",
        amount: plan.renewalTokens,
        expiresAt: tokenExpiryFrom(start),
        reference: `Token omaggio del piano ${plan.name} (attivazione di prova)`,
        createdAt: start,
      });
    }
    await tx.insert(auditLogs).values({ actor: user.email, action: "billing.simulated_subscription", entity: "partner", entityId: partner.id, data: { planCode, period } });
  });
  updateTag(`partner:${partner.slug}`);
  updateTag("catalog");
  revalidatePath("/area-partner", "layout");
}

export type GoogleSearchResult = { ok: true; matches: GooglePlaceMatch[] } | { ok: false; error: string };

/** Cerca l'attività su Google per collegarne le recensioni. Ogni ricerca costa: massimo 30 al giorno. */
export async function searchGoogleBusiness(rawQuery: string): Promise<GoogleSearchResult> {
  await requirePartner();
  if (!googlePlacesEnabled()) return { ok: false, error: "Il collegamento con Google non è ancora attivo." };
  const query = rawQuery.trim().replace(/\s+/g, " ");
  if (query.length < 3 || query.length > 120) return { ok: false, error: "Scrivi il nome dell'attività e il comune" };
  if (await ipRateLimited("google_search", 30, 24 * 60)) return { ok: false, error: "Hai fatto molte ricerche oggi. Riprova domani." };
  return { ok: true, matches: await searchGooglePlaces(query) };
}

/** Collega (o scollega, con null) la scheda Google Maps: le recensioni compaiono sulla scheda pubblica. */
export async function linkGooglePlace(placeId: string | null) {
  const { user, partner } = await requirePartner();
  if (placeId !== null && !/^[\w-]{10,300}$/.test(placeId)) return;
  await db.update(partners).set({ googlePlaceId: placeId }).where(eq(partners.id, partner.id));
  // Registro per il Backoffice: chi ha collegato quale scheda (un partner non deve prendersi le recensioni di un altro).
  await db.insert(auditLogs).values({
    actor: user.email,
    action: placeId ? "partner.google_linked" : "partner.google_unlinked",
    entity: "partner",
    entityId: partner.id,
    data: { placeId },
  });
  updateTag(`partner:${partner.slug}`);
  revalidatePath("/area-partner/scheda");
}

// ---------------------------------------------------------------------------
// Assistenza: richieste al team di geco dall'Area Partner (identità verificata dalla sessione)
// ---------------------------------------------------------------------------

const SupportMessage = z.string().trim().min(2, "Scrivi il messaggio").max(MESSAGE_MAX, "Messaggio troppo lungo");

const SupportTicketSchema = z.object({
  topic: z.enum(TICKET_TOPICS.map((t) => t.value), { error: "Scegli l'argomento" }),
  subject: z.string().trim().min(3, "Scrivi l'oggetto in poche parole").max(150, "Oggetto troppo lungo"),
  body: SupportMessage,
});

export async function openSupportTicket(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requirePartner();
  const parsed = SupportTicketSchema.safeParse({ topic: formData.get("topic"), subject: formData.get("subject"), body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (await ipRateLimited("support_partner", 20, 60)) return { error: "Hai aperto molte richieste nell'ultima ora. Riprova più tardi." };
  const ticket = await openTicket({
    channel: "partner_area",
    topic: parsed.data.topic,
    subject: parsed.data.subject,
    body: parsed.data.body,
    requesterName: user.name,
    requesterEmail: user.email,
    sessionUserId: user.id,
  });
  revalidatePath("/area-partner/assistenza");
  redirect(`/area-partner/assistenza/${ticket.number}`);
}

export async function replySupportTicket(number: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, partner } = await requirePartner();
  const body = SupportMessage.safeParse(formData.get("body"));
  if (!body.success) return { error: body.error.issues[0].message };
  if (!(await replyFromPartner(partner.id, number, user, body.data))) return { error: "Richiesta non trovata" };
  revalidatePath(`/area-partner/assistenza/${number}`);
  revalidatePath("/area-partner/assistenza");
  return { ok: "Messaggio inviato: ti rispondiamo qui e per email" };
}
