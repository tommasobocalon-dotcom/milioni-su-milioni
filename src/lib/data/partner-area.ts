import "server-only";
import { and, asc, count, desc, eq, gt, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  areaExtensions,
  boosts,
  leadEvents,
  leads,
  municipalities,
  partners,
  partnerServices,
  plans,
  portfolioItems,
  provinces,
  services,
  showcaseFeatures,
  subscriptions } from "@/lib/db/schema";

/**
 * Dati dell'Area Partner. Tutte le funzioni ricevono l'id del partner dalla sessione
 * (requirePartner) e filtrano sempre per quel partner.
 */

/** Lead visibili al partner: verificati e consegnati, esclusi duplicati e richieste mai confermate. */
const visible = (partnerId: string) =>
  and(eq(leads.partnerId, partnerId), isNotNull(leads.deliveredAt), ne(leads.charge, "duplicate"));

export async function getSubscription(partnerId: string) {
  const [row] = await db
    .select({
      planCode: plans.code,
      planName: plans.name,
      planWeight: plans.visibilityWeight,
      monthlyPriceCents: plans.monthlyPriceCents,
      yearlyPriceCents: plans.yearlyPriceCents,
      maxProvinces: plans.maxProvinces,
      maxServices: plans.maxServices,
      maxPortfolioItems: plans.maxPortfolioItems,
      maxUsers: plans.maxUsers,
      status: subscriptions.status,
      period: subscriptions.period,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.partnerId, partnerId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return row ?? null;
}

const leadListColumns = {
  id: leads.id,
  clientName: leads.clientName,
  requestType: leads.requestType,
  description: leads.description,
  municipality: municipalities.name,
  status: leads.status,
  charge: leads.charge,
  unlockExpiresAt: leads.unlockExpiresAt,
  createdAt: leads.createdAt,
  answers: leads.answers,
};

export type LeadListItem = Awaited<ReturnType<typeof listLeads>>[number];

export async function listLeads(partnerId: string, status?: string, limit = 100) {
  const statuses = ["new", "seen", "contacted", "quote_sent", "won", "lost"] as const;
  const filter = statuses.find((s) => s === status);
  return db
    .select(leadListColumns)
    .from(leads)
    .innerJoin(municipalities, eq(municipalities.id, leads.municipalityId))
    .where(and(visible(partnerId), filter ? eq(leads.status, filter) : undefined))
    .orderBy(desc(leads.createdAt))
    .limit(limit);
}

export async function countLeadsByStatus(partnerId: string) {
  const rows = await db
    .select({ status: leads.status, n: count() })
    .from(leads)
    .where(visible(partnerId))
    .groupBy(leads.status);
  const out: Record<string, number> = { all: 0 };
  for (const r of rows) {
    out[r.status] = r.n;
    out.all += r.n;
  }
  return out;
}

export async function getLeadDetail(partnerId: string, leadId: string) {
  const [lead] = await db
    .select({
      id: leads.id,
      clientName: leads.clientName,
      clientEmail: leads.clientEmail,
      clientPhone: leads.clientPhone,
      requestType: leads.requestType,
      answers: leads.answers,
      description: leads.description,
      timing: leads.timing,
      callbackSlot: leads.callbackSlot,
      municipality: municipalities.name,
      serviceName: services.name,
      status: leads.status,
      charge: leads.charge,
      tokensCharged: leads.tokensCharged,
      deliveredAt: leads.deliveredAt,
      reportReason: leads.reportReason,
      reportStatus: leads.reportStatus,
      notes: leads.notes,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .innerJoin(municipalities, eq(municipalities.id, leads.municipalityId))
    .leftJoin(services, eq(services.id, leads.serviceId))
    .where(and(visible(partnerId), eq(leads.id, leadId)));
  if (!lead) return null;
  const events = await db.select().from(leadEvents).where(eq(leadEvents.leadId, lead.id)).orderBy(asc(leadEvents.createdAt));

  return { ...lead, events };
}

export async function getOverview(partnerId: string) {
  const [sub, counts, recent, partner, priceCount] = await Promise.all([
    getSubscription(partnerId),
    countLeadsByStatus(partnerId),
    listLeads(partnerId, undefined, 5),
    db
      .select({ completeness: partners.completeness, responseMinutes: partners.responseMinutes, slug: partners.slug })
      .from(partners)
      .where(eq(partners.id, partnerId)),
    db.select({ n: count() }).from(partnerServices).where(eq(partnerServices.partnerId, partnerId)),
  ]);

  return {
    sub,
    counts,
    recent,
    completeness: partner[0]?.completeness ?? 0,
    responseMinutes: partner[0]?.responseMinutes ?? null,
    priceCount: priceCount[0]?.n ?? 0,
  };
}

export async function getPriceList(partnerId: string) {
  return db
    .select({
      id: partnerServices.id,
      serviceId: partnerServices.serviceId,
      serviceName: services.name,
      priceFrom: partnerServices.priceFrom,
      priceTo: partnerServices.priceTo,
      unit: partnerServices.unit,
      notes: partnerServices.notes,
    })
    .from(partnerServices)
    .innerJoin(services, eq(services.id, partnerServices.serviceId))
    .where(eq(partnerServices.partnerId, partnerId))
    .orderBy(asc(partnerServices.sortOrder));
}

export type PriceListRow = Awaited<ReturnType<typeof getPriceList>>[number];

/** Servizi della categoria del partner: quelli che può mettere nel listino. */
export async function getListableServices(partnerId: string) {
  return db
    .select({ id: services.id, name: services.name, defaultUnit: services.defaultUnit })
    .from(services)
    .innerJoin(partners, eq(partners.categoryId, services.categoryId))
    .where(eq(partners.id, partnerId))
    .orderBy(asc(services.name));
}

export async function getPortfolio(partnerId: string) {
  return db
    .select({
      id: portfolioItems.id,
      title: portfolioItems.title,
      description: portfolioItems.description,
      municipality: municipalities.name,
      contract: portfolioItems.contract,
      priceCents: portfolioItems.priceCents,
      sqm: portfolioItems.sqm,
      rooms: portfolioItems.rooms,
      status: portfolioItems.status,
      imageUrl: portfolioItems.imageUrl,
      hasBeforeAfter: portfolioItems.hasBeforeAfter,
    })
    .from(portfolioItems)
    .leftJoin(municipalities, eq(municipalities.id, portfolioItems.municipalityId))
    .where(eq(portfolioItems.partnerId, partnerId))
    .orderBy(asc(portfolioItems.sortOrder));
}

/** Lavori con foto da mettere in Ispirazione, con la scadenza se sono già in evidenza. */
export async function getExtras(partnerId: string, now: Date) {
  const [items, showcases] = await Promise.all([
    db
      .select({ id: portfolioItems.id, title: portfolioItems.title })
      .from(portfolioItems)
      .where(and(eq(portfolioItems.partnerId, partnerId), isNotNull(portfolioItems.imageUrl)))
      .orderBy(asc(portfolioItems.sortOrder)),
    db
      .select({ itemId: showcaseFeatures.portfolioItemId, endsAt: sql<Date>`max(${showcaseFeatures.endsAt})`.mapWith((v) => new Date(v)) })
      .from(showcaseFeatures)
      .where(and(eq(showcaseFeatures.partnerId, partnerId), gt(showcaseFeatures.endsAt, now)))
      .groupBy(showcaseFeatures.portfolioItemId),
  ]);
  const showcaseEnd = new Map(showcases.map((x) => [x.itemId, x.endsAt]));
  return { items: items.map((i) => ({ ...i, activeUntil: showcaseEnd.get(i.id) ?? null })) };
}

/** La prova gratuita spetta solo a chi non ha mai avuto un abbonamento Stripe (vedi createSubscriptionCheckout). */
export async function hadStripeSubscription(partnerId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.partnerId, partnerId), isNotNull(subscriptions.stripeSubscriptionId)))
    .limit(1);
  return !!row;
}

/** Fine del boost già pagato di quel tipo, logo in Home o ricerca (null se non ce n'è uno in corso o in coda). */
export async function getBoostEnd(partnerId: string, placement: "home" | "search", now: Date): Promise<Date | null> {
  const [row] = await db
    .select({ endsAt: sql<Date | null>`max(${boosts.endsAt})`.mapWith((v) => (v ? new Date(v) : null)) })
    .from(boosts)
    .where(and(eq(boosts.partnerId, partnerId), eq(boosts.placement, placement), gt(boosts.endsAt, now)));
  return row?.endsAt ?? null;
}

/** Comuni aggiunti con l'estensione territoriale ancora in corso (o in coda), con la data di fine. */
export async function getMunicipalityExtensions(partnerId: string, now: Date) {
  return db
    .select({
      id: municipalities.id,
      name: municipalities.name,
      provinceCode: provinces.code,
      endsAt: sql<Date>`max(${areaExtensions.endsAt})`.mapWith((v) => new Date(v)),
    })
    .from(areaExtensions)
    .innerJoin(municipalities, eq(municipalities.id, areaExtensions.municipalityId))
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
    .where(and(eq(areaExtensions.partnerId, partnerId), gt(areaExtensions.endsAt, now)))
    .groupBy(municipalities.id, municipalities.name, provinces.code)
    .orderBy(municipalities.name);
}
