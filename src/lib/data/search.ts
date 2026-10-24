import "server-only";
import { and, eq, gt, inArray, lte, or, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db/client";
import { recordProfileEvents } from "./stats";
import {
  boosts,
  categories,
  municipalities,
  partners,
  partnerServices,
  plans,
  portfolioItems,
  provinces,
  reviews,
  serviceAreas,
  services,
  subscriptions,
} from "@/lib/db/schema";
import { distanceKm, formatPriceRange, type PriceUnit } from "@/lib/domain/format";
import { organicScore, RATING_PRIOR } from "@/lib/domain/ranking";
import { bayesianScore } from "@/lib/domain/rating";
import type { Place } from "./catalog";

export type SortKey = "rilevanza" | "valutazione" | "recensioni" | "distanza" | "prezzo";

export type PartnerListItem = {
  id: string;
  slug: string;
  href: string;
  displayName: string;
  logoUrl: string | null;
  tagline: string;
  categoryName: string;
  categorySlug: string;
  partnerType: "agency" | "technician" | "artisan" | "b2b";
  municipalityName: string;
  provinceCode: string;
  rating: { average: number; count: number };
  responseMinutes: number | null;
  planCode: string | null;
  verified: boolean;
  price: { label: string; serviceName: string; fromCents: number | null } | null;
  portfolioCount: number;
  distanceKm: number | null;
  sponsored: boolean;
  lat: number;
  lng: number;
};

export function profileHref(p: { partnerType: string; provinceSlug: string; categorySlug: string; slug: string }) {
  return p.partnerType === "agency"
    ? `/agenzie/${p.provinceSlug}/${p.slug}`
    : `/professionisti/${p.provinceSlug}/${p.categorySlug}/${p.slug}`;
}

export async function searchPartners(input: {
  partnerType?: "agency" | "pro";
  categoryId?: string;
  serviceId?: string;
  place?: Place | null;
  minRating?: number;
  sort?: SortKey;
}): Promise<{ sponsored: PartnerListItem[]; results: PartnerListItem[] }> {
  await connection();
  const now = new Date();

  const ratingAgg = db
    .select({
      partnerId: reviews.partnerId,
      average: sql<number>`avg(${reviews.rating})::float`.as("average"),
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(reviews)
    .where(eq(reviews.status, "published"))
    .groupBy(reviews.partnerId)
    .as("rating_agg");

  const conditions = [eq(partners.accountStatus, "active")];
  if (input.categoryId) conditions.push(eq(partners.categoryId, input.categoryId));
  if (input.partnerType === "agency") conditions.push(eq(partners.type, "agency"));
  if (input.partnerType === "pro") conditions.push(sql`${partners.type} <> 'agency'`);
  if (input.place) {
    // Il partner serve il comune cercato, oppure tutta la sua provincia.
    conditions.push(
      sql`exists (select 1 from ${serviceAreas} sa where sa.partner_id = ${partners.id}
        and (sa.municipality_id = ${input.place.id} or sa.province_id = ${input.place.provinceId}))`,
    );
  }
  if (input.serviceId) {
    conditions.push(
      sql`exists (select 1 from ${partnerServices} ps where ps.partner_id = ${partners.id} and ps.service_id = ${input.serviceId})`,
    );
  }

  const rows = await db
    .select({
      id: partners.id,
      slug: partners.slug,
      displayName: partners.displayName,
      logoUrl: partners.logoUrl,
      tagline: partners.tagline,
      partnerType: partners.type,
      lat: partners.lat,
      lng: partners.lng,
      completeness: partners.completeness,
      responseMinutes: partners.responseMinutes,
      verified: sql<boolean>`${partners.verificationStatus} = 'verified'`,
      categoryName: categories.name,
      categorySlug: categories.slug,
      municipalityName: municipalities.name,
      provinceCode: provinces.code,
      provinceSlug: provinces.slug,
      provinceId: provinces.id,
      ratingAverage: sql<number>`coalesce(${ratingAgg.average}, 0)`,
      ratingCount: sql<number>`coalesce(${ratingAgg.count}, 0)`,
      planCode: plans.code,
      planWeight: plans.visibilityWeight,
      portfolioCount: sql<number>`(select count(*)::int from ${portfolioItems} pi where pi.partner_id = ${partners.id})`,
    })
    .from(partners)
    .innerJoin(categories, eq(categories.id, partners.categoryId))
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
    .leftJoin(ratingAgg, eq(ratingAgg.partnerId, partners.id))
    .leftJoin(subscriptions, and(eq(subscriptions.partnerId, partners.id), eq(subscriptions.status, "active")))
    .leftJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(...conditions));

  if (rows.length === 0) return { sponsored: [], results: [] };
  const ids = rows.map((r) => r.id);

  // Prezzo indicativo: quello del servizio cercato, altrimenti il primo del listino.
  const priceRows = await db
    .select({
      partnerId: partnerServices.partnerId,
      serviceId: partnerServices.serviceId,
      serviceName: services.name,
      priceFrom: partnerServices.priceFrom,
      priceTo: partnerServices.priceTo,
      unit: partnerServices.unit,
      sortOrder: partnerServices.sortOrder,
    })
    .from(partnerServices)
    .innerJoin(services, eq(services.id, partnerServices.serviceId))
    .where(
      and(
        inArray(partnerServices.partnerId, ids),
        input.serviceId
          ? eq(partnerServices.serviceId, input.serviceId)
          : or(gt(partnerServices.priceFrom, 0), gt(partnerServices.priceTo, 0)),
      ),
    );
  const priceByPartner = new Map<string, (typeof priceRows)[number]>();
  for (const p of priceRows.sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (!priceByPartner.has(p.partnerId)) priceByPartner.set(p.partnerId, p);
  }

  // Boost attivi per la categoria nella provincia cercata.
  const boosted = new Set<string>();
  if (input.place) {
    const active = await db
      .select({ partnerId: boosts.partnerId })
      .from(boosts)
      .where(
        and(
          inArray(boosts.partnerId, ids),
          eq(boosts.provinceId, input.place.provinceId),
          lte(boosts.startsAt, now),
          gt(boosts.endsAt, now),
          input.categoryId ? eq(boosts.categoryId, input.categoryId) : undefined,
        ),
      );
    for (const b of active) boosted.add(b.partnerId);
  }

  const items = rows
    .map((r) => {
      const price = priceByPartner.get(r.id);
      const label = price ? formatPriceRange(price.priceFrom, price.priceTo, price.unit as PriceUnit) : null;
      const dist = input.place ? distanceKm(input.place, r) : null;
      const item: PartnerListItem & { score: number; bayes: number } = {
        id: r.id,
        slug: r.slug,
        href: profileHref(r),
        displayName: r.displayName,
        logoUrl: r.logoUrl,
        tagline: r.tagline,
        categoryName: r.categoryName,
        categorySlug: r.categorySlug,
        partnerType: r.partnerType,
        municipalityName: r.municipalityName,
        provinceCode: r.provinceCode,
        rating: { average: r.ratingAverage, count: r.ratingCount },
        responseMinutes: r.responseMinutes,
        planCode: r.planCode,
        verified: r.verified,
        price: price && label ? { label, serviceName: price.serviceName, fromCents: price.priceFrom } : null,
        portfolioCount: r.portfolioCount,
        distanceKm: dist,
        sponsored: boosted.has(r.id),
        lat: r.lat,
        lng: r.lng,
        bayes: bayesianScore({ average: r.ratingAverage, count: r.ratingCount }, RATING_PRIOR),
        score: organicScore({
          rating: { average: r.ratingAverage, count: r.ratingCount },
          completeness: r.completeness,
          responseMinutes: r.responseMinutes,
          planWeight: r.planWeight ?? 0,
          distanceKm: dist,
        }),
      };
      return item;
    })
    .filter((i) => !input.minRating || i.rating.average >= input.minRating);

  const sorters: Record<SortKey, (a: (typeof items)[number], b: (typeof items)[number]) => number> = {
    rilevanza: (a, b) => b.score - a.score,
    valutazione: (a, b) => b.bayes - a.bayes,
    recensioni: (a, b) => b.rating.count - a.rating.count,
    distanza: (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
    prezzo: (a, b) => (a.price?.fromCents ?? Infinity) - (b.price?.fromCents ?? Infinity),
  };
  items.sort(sorters[input.sort ?? "rilevanza"]);

  const strip = (i: (typeof items)[number]): PartnerListItem => {
    const out: Partial<typeof i> = { ...i };
    delete out.score;
    delete out.bayes;
    return out as PartnerListItem;
  };
  // Al massimo due posti sponsorizzati, separati dai risultati organici ed etichettati.
  const sponsored = items.filter((i) => i.sponsored).slice(0, 2);
  await recordProfileEvents(
    items.map((i) => i.id),
    "impression",
  );
  return {
    sponsored: sponsored.map(strip),
    results: items.filter((i) => !sponsored.includes(i)).map((i) => ({ ...strip(i), sponsored: false })),
  };
}
