import "server-only";
import { and, asc, count, desc, eq, gt, isNotNull, ne, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { asPartner } from "@/lib/db/tenant";
import { freeLeadsLeft } from "@/lib/domain/free-plan";
import { freeLeadsUsed } from "@/lib/leads/service";
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
  subscriptions,
  type LeadAnswer } from "@/lib/db/schema";

/**
 * Dati dell'Area Partner. Tutte le funzioni ricevono l'id del partner dalla sessione
 * (requirePartner) e filtrano sempre per quel partner.
 */

/** Lead visibili al partner: verificati e consegnati, esclusi duplicati e richieste mai confermate. */
const visible = (partnerId: string) =>
  and(eq(leads.partnerId, partnerId), isNotNull(leads.deliveredAt), ne(leads.charge, "duplicate"));

/**
 * Richiesta bloccata dal piano gratuito (oltre le 3 del mese): il partner vede tipo di lavoro, comune e tempi, non chi è
 * il cliente. Anche descrizione e risposte restano nascoste, perché il cliente può averci scritto il suo numero.
 * Il filtro sta nella query, così i dati non arrivano mai al browser.
 */
const unlessLocked = <T>(column: AnyColumn, empty: SQL) => sql<T>`case when ${leads.charge} = 'locked' then ${empty} else ${column} end`;
const hiddenText = (column: AnyColumn) => unlessLocked<string | null>(column, sql`null`);
const hiddenAnswers = () => unlessLocked<LeadAnswer[]>(leads.answers, sql`'[]'::jsonb`).mapWith(leads.answers);

export async function getSubscription(partnerId: string) {
  return asPartner(partnerId, async (tx) => {
    const [row] = await tx
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
        free: subscriptions.free,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.partnerId, partnerId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return row ?? null;
  });
}

const leadListColumns = {
  id: leads.id,
  clientName: hiddenText(leads.clientName),
  requestType: leads.requestType,
  description: hiddenText(leads.description),
  municipality: municipalities.name,
  status: leads.status,
  charge: leads.charge,
  unlockExpiresAt: leads.unlockExpiresAt,
  createdAt: leads.createdAt,
  answers: hiddenAnswers(),
};

export type LeadListItem = Awaited<ReturnType<typeof listLeads>>[number];

export async function listLeads(partnerId: string, status?: string, limit = 100) {
  return asPartner(partnerId, async (tx) => {
    const statuses = ["new", "seen", "contacted", "quote_sent", "won", "lost"] as const;
    const filter = statuses.find((s) => s === status);
    return tx
      .select(leadListColumns)
      .from(leads)
      .innerJoin(municipalities, eq(municipalities.id, leads.municipalityId))
      .where(and(visible(partnerId), filter ? eq(leads.status, filter) : undefined))
      .orderBy(desc(leads.createdAt))
      .limit(limit);
  });
}

export async function countLeadsByStatus(partnerId: string) {
  return asPartner(partnerId, async (tx) => {
    const rows = await tx
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
  });
}

export async function getLeadDetail(partnerId: string, leadId: string) {
  return asPartner(partnerId, async (tx) => {
    const [lead] = await tx
      .select({
        id: leads.id,
        clientName: hiddenText(leads.clientName),
        clientEmail: hiddenText(leads.clientEmail),
        clientPhone: hiddenText(leads.clientPhone),
        requestType: leads.requestType,
        answers: hiddenAnswers(),
        description: hiddenText(leads.description),
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
    const events = await tx.select().from(leadEvents).where(eq(leadEvents.leadId, lead.id)).orderBy(asc(leadEvents.createdAt));

    return { ...lead, events };
  });
}

export async function getOverview(partnerId: string) {
  const [sub, counts, recent, partner, priceCount] = await Promise.all([
    getSubscription(partnerId),
    countLeadsByStatus(partnerId),
    listLeads(partnerId, undefined, 5),
    asPartner(partnerId, (tx) =>
      tx
        .select({ completeness: partners.completeness, responseMinutes: partners.responseMinutes, slug: partners.slug })
        .from(partners)
        .where(eq(partners.id, partnerId)),
    ),
    asPartner(partnerId, (tx) => tx.select({ n: count() }).from(partnerServices).where(eq(partnerServices.partnerId, partnerId))),
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
  return asPartner(partnerId, async (tx) => {
    return tx
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
  });
}

export type PriceListRow = Awaited<ReturnType<typeof getPriceList>>[number];

/** Servizi della categoria del partner: quelli che può mettere nel listino. */
export async function getListableServices(partnerId: string) {
  return asPartner(partnerId, async (tx) => {
    return tx
      .select({ id: services.id, name: services.name, defaultUnit: services.defaultUnit })
      .from(services)
      .innerJoin(partners, eq(partners.categoryId, services.categoryId))
      .where(eq(partners.id, partnerId))
      .orderBy(asc(services.name));
  });
}

export async function getPortfolio(partnerId: string) {
  return asPartner(partnerId, async (tx) => {
    return tx
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
        photos: portfolioItems.photos,
        hasBeforeAfter: portfolioItems.hasBeforeAfter,
        inInspiration: portfolioItems.inInspiration,
      })
      .from(portfolioItems)
      .leftJoin(municipalities, eq(municipalities.id, portfolioItems.municipalityId))
      .where(eq(portfolioItems.partnerId, partnerId))
      .orderBy(asc(portfolioItems.sortOrder));
  });
}

/** Lavori con foto da mettere in Ispirazione, con la scadenza se sono già in evidenza. */
export async function getExtras(partnerId: string, now: Date) {
  return asPartner(partnerId, async (tx) => {
    const [items, showcases] = await Promise.all([
      tx
        .select({ id: portfolioItems.id, title: portfolioItems.title })
        .from(portfolioItems)
        .where(and(eq(portfolioItems.partnerId, partnerId), isNotNull(portfolioItems.imageUrl)))
        .orderBy(asc(portfolioItems.sortOrder)),
      tx
        .select({ itemId: showcaseFeatures.portfolioItemId, endsAt: sql<Date>`max(${showcaseFeatures.endsAt})`.mapWith((v) => new Date(v)) })
        .from(showcaseFeatures)
        .where(and(eq(showcaseFeatures.partnerId, partnerId), gt(showcaseFeatures.endsAt, now)))
        .groupBy(showcaseFeatures.portfolioItemId),
    ]);
    const showcaseEnd = new Map(showcases.map((x) => [x.itemId, x.endsAt]));
    return { items: items.map((i) => ({ ...i, activeUntil: showcaseEnd.get(i.id) ?? null })) };
  });
}

/** La prova gratuita spetta solo a chi non ha mai avuto un abbonamento Stripe (vedi createSubscriptionCheckout). */
export async function hadStripeSubscription(partnerId: string): Promise<boolean> {
  return asPartner(partnerId, async (tx) => {
    const [row] = await tx
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(eq(subscriptions.partnerId, partnerId), isNotNull(subscriptions.stripeSubscriptionId)))
      .limit(1);
    return !!row;
  });
}

/** Piano gratuito: richieste con i contatti usate e richieste in attesa senza contatti. */
export async function getFreePlanUsage(partnerId: string) {
  return asPartner(partnerId, async (tx) => {
    const [used, [locked]] = await Promise.all([
      freeLeadsUsed(tx, partnerId),
      tx.select({ n: count() }).from(leads).where(and(eq(leads.partnerId, partnerId), eq(leads.charge, "locked"))),
    ]);
    return { used, left: freeLeadsLeft(used), locked: locked?.n ?? 0 };
  });
}

/** L'azienda è partita dal piano gratuito di lancio: niente prova di 7 giorni e promo garantite anche dopo i 6 mesi. */
export async function hadFreePlan(partnerId: string): Promise<boolean> {
  return asPartner(partnerId, async (tx) => {
    const [row] = await tx
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(eq(subscriptions.partnerId, partnerId), eq(subscriptions.free, true)))
      .limit(1);
    return !!row;
  });
}

/** Fine del boost già pagato di quel tipo, logo in Home o ricerca (null se non ce n'è uno in corso o in coda). */
export async function getBoostEnd(partnerId: string, placement: "home" | "search", now: Date): Promise<Date | null> {
  return asPartner(partnerId, async (tx) => {
    const [row] = await tx
      .select({ endsAt: sql<Date | null>`max(${boosts.endsAt})`.mapWith((v) => (v ? new Date(v) : null)) })
      .from(boosts)
      .where(and(eq(boosts.partnerId, partnerId), eq(boosts.placement, placement), gt(boosts.endsAt, now)));
    return row?.endsAt ?? null;
  });
}

/** Province (e, nello storico, comuni) aggiunte con l'estensione territoriale ancora in corso o in coda, con la data di fine. */
export async function getAreaExtensions(partnerId: string, now: Date) {
  const label = sql<string>`case when ${municipalities.id} is null then 'Provincia di ' || ${provinces.name}
    else ${municipalities.name} || ' (' || ${provinces.code} || ')' end`;
  return asPartner(partnerId, async (tx) => {
    return tx
      .select({ label, endsAt: sql<Date>`max(${areaExtensions.endsAt})`.mapWith((v) => new Date(v)) })
      .from(areaExtensions)
      .leftJoin(municipalities, eq(municipalities.id, areaExtensions.municipalityId))
      .innerJoin(provinces, eq(provinces.id, sql`coalesce(${areaExtensions.provinceId}, ${municipalities.provinceId})`))
      .where(and(eq(areaExtensions.partnerId, partnerId), gt(areaExtensions.endsAt, now)))
      .groupBy(label)
      .orderBy(label);
  });
}

/** Comune della sede dell'azienda, con la sigla della provincia. */
export async function getHomeMunicipality(partnerId: string) {
  return asPartner(partnerId, async (tx) => {
    const [row] = await tx
      .select({ name: municipalities.name, provinceCode: provinces.code })
      .from(partners)
      .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
      .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
      .where(eq(partners.id, partnerId));
    return row ?? null;
  });
}
