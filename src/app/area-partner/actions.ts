"use server";

import { and, count, eq, isNotNull, max } from "drizzle-orm";
import { projectPhotosError, videoEmbedUrl } from "@/lib/domain/extras";
import { canBoost, PREMIUM_WEIGHT } from "@/lib/domain/ranking";
import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { COMPANY_COOKIE, partnersOfUser, requirePartner } from "@/lib/auth/session";
import { ipRateLimited } from "@/lib/security/ip-limit";
import { putImage } from "@/lib/storage";
import { BillingError, createAreaExtensionCheckout, createHomeSponsorCheckout, createSearchBoostCheckout, createPlanChangeSession, createPortalSession, createSubscriptionCheckout, stripeConfigured } from "@/lib/billing/stripe";
import { db } from "@/lib/db/client";
import { auditLogs, leadEvents, leads, partners, partnerServices, plans, portfolioItems, priceUnit, subscriptions, users } from "@/lib/db/schema";
import { getListableServices, getPriceList, getSubscription } from "@/lib/data/partner-area";
import { demoMode } from "@/lib/demo-mode";
import { parseAmount } from "@/lib/domain/format";
import { parseOpeningHours, parseSpecialties } from "@/lib/domain/profile-fields";
import { canReportLead, REPORT_REASONS } from "@/lib/domain/lead-rules";
import { AREA_EXTENSION_OFFER, HOME_SPONSOR_PACKAGES, municipalityIdsFrom, SEARCH_BOOST_PACKAGES } from "@/lib/domain/offers";

import { grantAreaExtensions, grantHomeSponsor, grantSearchBoost } from "@/lib/leads/service";
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
  if (!lead || !status.success) return;
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
  if (!lead) return { error: "Richiesta non trovata" };
  if (!reason) return { error: "Scegli un motivo tra quelli previsti" };
  if (lead.reportStatus) return { error: "Hai già segnalato questa richiesta" };
  const now = new Date();
  if (!canReportLead(lead.deliveredAt, now)) return { error: "Sono passate più di 72 ore dalla consegna: non è più possibile segnalarlo" };
  await db.update(leads).set({ reportReason: reason.value, reportStatus: "open", reportedAt: now }).where(eq(leads.id, lead.id));
  await db.insert(leadEvents).values({ leadId: lead.id, type: "reported", message: `Segnalato: ${reason.label}`, actor: user.name, createdAt: now });
  await db.insert(auditLogs).values({ actor: user.email, action: "lead.report", entity: "lead", entityId: lead.id, data: { reason: reason.value } });
  revalidatePath(`/area-partner/lead/${lead.id}`);
  return { ok: true };
}

export type ActionState = { error?: string; ok?: string };

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
  specialties: z.string().max(1000).optional(),
  openingHours: z.string().max(1500).optional(),
  foundedYear: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number("Anno di fondazione non valido").int("Anno di fondazione non valido").min(1800, "Anno di fondazione non valido").max(new Date().getFullYear(), "Anno di fondazione non valido").optional(),
  ),
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
async function saveImage(folder: "partners" | "avatars", partnerId: string, file: FormDataEntryValue | null): Promise<{ url: string } | { error: string } | null> {
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
    Object.fromEntries(["firstName", "lastName", "businessName", "vatNumber", "address", "tagline", "description", "phone", "email", "specialties", "openingHours", "foundedYear"].map((k) => [k, field(k)])),
  );
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const openingHours = parseOpeningHours(parsed.data.openingHours ?? "");
  if ("error" in openingHours) return openingHours;

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
        specialties: parseSpecialties(d.specialties ?? ""),
        openingHours,
        foundedYear: d.foundedYear ?? null,
        hideDirectContacts: formData.get("hideDirectContacts") === "on",
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
  title: z.string().trim().min(3, "Dai un titolo al lavoro").max(120),
  description: z.string().trim().min(10, "Scrivi una breve descrizione del lavoro").max(300, "La descrizione può avere al massimo 300 caratteri"),
  municipalityId: optionalInt(1_000_000),
  // Solo immobili (agenzie)
  contract: z.enum(["sale", "rent"]).optional(),
  priceEuro: optionalInt(100_000_000),
  sqm: optionalInt(100_000),
  rooms: optionalInt(100),
  hasBeforeAfter: z.literal("on").optional(),
  videoUrl: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || videoEmbedUrl(v) !== null, "Il video deve essere un link di YouTube o Vimeo"),
});

/** Agenzie: immobili. Tutti gli altri: lavori svolti. Il tipo arriva dal partner, non dal form. */
export async function addPortfolioItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { partner } = await requirePartner();
  const parsed = PortfolioSchema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const isProperty = partner.type === "agency";
  if (isProperty && !d.contract) return { error: "Scegli vendita o affitto" };

  // Limiti del piano (documento del 4/11/2026): progetti in bacheca e video solo per Premium.
  const [plan] = await db
    .select({ name: plans.name, maxItems: plans.maxPortfolioItems, weight: plans.visibilityWeight })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(eq(subscriptions.partnerId, partner.id), eq(subscriptions.status, "active")));
  const [{ n }] = await db.select({ n: count() }).from(portfolioItems).where(eq(portfolioItems.partnerId, partner.id));
  if (!plan) return { error: "Attiva un piano per pubblicare i tuoi lavori" };
  if (plan.maxItems != null && n >= plan.maxItems) {
    return { error: `Il piano ${plan.name} include fino a ${plan.maxItems} progetti: elimina un progetto o cambia piano` };
  }
  if (d.videoUrl && plan.weight < PREMIUM_WEIGHT) return { error: "I video sono inclusi nel piano Premium" };

  // Da 2 a 8 foto: prima si controllano tutte, poi si salvano, così un file sbagliato non lascia foto a metà.
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const countError = projectPhotosError(files.length);
  if (countError) return { error: countError };
  const checked: { file: File; ext: "jpg" | "png" | "webp" }[] = [];
  for (const file of files) {
    if (file.size > IMAGE_MAX_BYTES) return { error: `"${file.name}" pesa più di 2 MB` };
    const ext = await sniffImage(file);
    if (!ext) return { error: `"${file.name}" non è una foto JPG, PNG o WebP` };
    checked.push({ file, ext });
  }
  const photos = await Promise.all(
    checked.map(async ({ file, ext }) => (await putImage(`portfolio/${partner.id}-${randomUUID()}.${ext}`, Buffer.from(await file.arrayBuffer()), ext)).url),
  );

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
    imageUrl: photos[0],
    photos,
    videoUrl: d.videoUrl || null,
    sortOrder: (last ?? -1) + 1,
  });
  updateTag(`partner:${partner.slug}`);
  revalidatePath("/area-partner/lavori");
  return { ok: "Lavoro pubblicato nella tua scheda e in Ispirazione" };
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
  revalidatePath("/area-partner/lavori");
}

export async function deletePortfolioItem(itemId: string) {
  const { partner } = await requirePartner();
  if (!Id.safeParse(itemId).success) return;
  await db.delete(portfolioItems).where(and(eq(portfolioItems.id, itemId), eq(portfolioItems.partnerId, partner.id)));
  updateTag(`partner:${partner.slug}`);
  revalidatePath("/area-partner/lavori");
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
  // Checkout e portale Stripe devono funzionare anche da sospeso: è così che il partner si riattiva.
  const { user, partner, memberRole } = await requirePartner({ allowSuspended: true });
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

/** I pacchetti (logo in Home, boost, estensione) sono solo per Normal e Premium (recap del cliente, 5/11/2026). */
async function canBuyPackages(partnerId: string) {
  const sub = await getSubscription(partnerId);
  return !!sub && canBoost(sub.planWeight);
}

/** Logo in evidenza in Home, pagato in euro: come gli extra, solo Normal e Premium. */
export async function startHomeSponsorCheckout(code: string): Promise<CheckoutState> {
  const { partner } = await requirePartner();
  if (!(await canBuyPackages(partner.id))) return { error: "Il logo in Home è per i piani Normal e Premium" };
  return billingAction((payer) => createHomeSponsorCheckout(payer, code), "billing.home_sponsor_checkout");
}

/** Solo in sviluppo e sul sito di prova senza Stripe: attiva il logo in Home senza pagamento. */
export async function simulateHomeSponsor(code: string) {
  if (!demoMode() || stripeConfigured()) return;
  const { user, partner } = await requirePartner();
  const pkg = HOME_SPONSOR_PACKAGES.find((p) => p.code === code);
  if (!pkg || !(await canBuyPackages(partner.id))) return;
  await db.transaction(async (tx) => {
    await grantHomeSponsor(tx, partner.id, pkg.days);
    await tx.insert(auditLogs).values({ actor: user.email, action: "billing.simulated_home_sponsor", entity: "partner", entityId: partner.id, data: { code } });
  });
  updateTag("boosts");
  revalidatePath("/area-partner", "layout");
}

/** Boost nella ricerca, pagato in euro: solo Normal e Premium (il Base non ha boost). */
export async function startSearchBoostCheckout(code: string): Promise<CheckoutState> {
  const { partner } = await requirePartner();
  if (!(await canBuyPackages(partner.id))) return { error: "Il boost è per i piani Normal e Premium" };
  return billingAction((payer) => createSearchBoostCheckout(payer, code), "billing.search_boost_checkout");
}

/** Solo in sviluppo e sul sito di prova senza Stripe: attiva il boost nella ricerca senza pagamento. */
export async function simulateSearchBoost(code: string) {
  if (!demoMode() || stripeConfigured()) return;
  const { user, partner } = await requirePartner();
  const pkg = SEARCH_BOOST_PACKAGES.find((p) => p.code === code);
  if (!pkg || !(await canBuyPackages(partner.id))) return;
  await db.transaction(async (tx) => {
    await grantSearchBoost(tx, partner.id, pkg.hours);
    await tx.insert(auditLogs).values({ actor: user.email, action: "billing.simulated_search_boost", entity: "partner", entityId: partner.id, data: { code } });
  });
  updateTag("boosts");
  revalidatePath("/area-partner", "layout");
}

/** Estensione territoriale ai comuni scelti, pagata in euro: solo Normal e Premium. */
export async function startAreaExtensionCheckout(ids: number[]): Promise<CheckoutState> {
  const { partner } = await requirePartner();
  if (!(await canBuyPackages(partner.id))) return { error: "L'estensione territoriale è per i piani Normal e Premium" };
  const valid = municipalityIdsFrom(ids);
  if (!valid) return { error: "Scegli da 1 a 40 comuni" };
  return billingAction((payer) => createAreaExtensionCheckout(payer, valid), "billing.area_extension_checkout");
}

/** Solo in sviluppo e sul sito di prova senza Stripe: attiva l'estensione senza pagamento. */
export async function simulateAreaExtension(ids: number[]): Promise<ActionState> {
  if (!demoMode() || stripeConfigured()) return { error: "Non disponibile" };
  const { user, partner } = await requirePartner();
  const valid = municipalityIdsFrom(ids);
  if (!valid || !(await canBuyPackages(partner.id))) return { error: "Scegli da 1 a 40 comuni" };
  const added = await db.transaction(async (tx) => {
    const n = await grantAreaExtensions(tx, partner.id, valid, AREA_EXTENSION_OFFER.days);
    await tx.insert(auditLogs).values({ actor: user.email, action: "billing.simulated_area_extension", entity: "partner", entityId: partner.id, data: { ids: valid } });
    return n;
  });
  updateTag("boosts");
  revalidatePath("/area-partner", "layout");
  return { ok: `Compari in ${added} ${added === 1 ? "comune" : "comuni"} in più per ${AREA_EXTENSION_OFFER.days} giorni` };
}

export async function startSubscriptionCheckout(planCode: string, period: "monthly" | "yearly"): Promise<CheckoutState> {
  if (period !== "monthly" && period !== "yearly") return { error: "Periodo non valido" };
  return billingAction((payer) => createSubscriptionCheckout(payer, planCode, period), "billing.subscription_checkout");
}

export async function openBillingPortal(): Promise<CheckoutState> {
  return billingAction((payer) => createPortalSession(payer.partnerId), "billing.portal");
}

/** Cambio di piano o di periodo durante l'abbonamento: conferma e pagamento della differenza nel portale Stripe. */
export async function startPlanChange(planCode: string, period: "monthly" | "yearly"): Promise<CheckoutState> {
  if (period !== "monthly" && period !== "yearly") return { error: "Periodo non valido" };
  return billingAction((payer) => createPlanChangeSession(payer.partnerId, planCode, period), "billing.plan_change");
}

/**
 * Solo in sviluppo e sul sito di prova, senza Stripe: attiva il piano senza pagamento, per provare il
 * percorso di registrazione. In produzione l'abbonamento nasce dal webhook di Stripe.
 */
export async function simulateSubscription(planCode: string, period: "monthly" | "yearly") {
  if (!demoMode() || stripeConfigured()) return;
  const { user, partner, memberRole } = await requirePartner();
  if (memberRole !== "owner" || (period !== "monthly" && period !== "yearly")) return;
  const [plan] = await db.select({ id: plans.id, name: plans.name }).from(plans).where(eq(plans.code, planCode));
  if (!plan) return;
  const start = new Date();
  const end = new Date(start);
  if (period === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  await db.transaction(async (tx) => {
    await tx.update(subscriptions).set({ status: "cancelled" }).where(eq(subscriptions.partnerId, partner.id));
    await tx.insert(subscriptions).values({ partnerId: partner.id, planId: plan.id, period, status: "active", currentPeriodStart: start, currentPeriodEnd: end });
    await tx.update(partners).set({ accountStatus: "active" }).where(eq(partners.id, partner.id));
    await tx.insert(auditLogs).values({ actor: user.email, action: "billing.simulated_subscription", entity: "partner", entityId: partner.id, data: { planCode, period } });
  });
  updateTag(`partner:${partner.slug}`);
  updateTag("catalog");
  revalidatePath("/area-partner", "layout");
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

/** Chi ha più aziende sceglie quale gestire: solo tra le sue, controllate sul database. */
export async function switchCompany(formData: FormData) {
  const { user } = await requirePartner({ allowSuspended: true });
  const id = Id.safeParse(formData.get("partnerId"));
  if (!id.success || !(await partnersOfUser(user.id)).some((p) => p.id === id.data)) return;
  (await cookies()).set(COMPANY_COOKIE, id.data, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
  redirect("/area-partner");
}
