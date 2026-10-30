import "server-only";
import { and, asc, eq, gt, isNotNull, or, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db/client";
import { categories, municipalities, partners, partnerServices, portfolioItems, provinces, reviews, services } from "@/lib/db/schema";
import type { PriceUnit } from "@/lib/domain/format";
import { median, pricePerSqm, type SqmSummary } from "@/lib/domain/price-compare";
import { profileHref } from "./search";

/** Servizi con almeno un prezzo pubblicato, per il menu di /confronta-prezzi. */
export type PricedService = {
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  partnerCount: number;
  /** Partner con un prezzo vero (non gratuito): decide il servizio mostrato per primo. */
  paidCount: number;
  unit: PriceUnit;
};

const published = or(gt(partnerServices.priceFrom, 0), gt(partnerServices.priceTo, 0), eq(partnerServices.priceFrom, 0));

export async function getPricedServices(): Promise<PricedService[]> {
  await connection();
  return db
    .select({
      slug: services.slug,
      name: services.name,
      categorySlug: categories.slug,
      categoryName: categories.name,
      unit: services.defaultUnit,
      partnerCount: sql<number>`count(distinct ${partners.id})::int`,
      paidCount: sql<number>`(count(distinct ${partners.id}) filter (where ${partnerServices.priceFrom} > 0 or ${partnerServices.priceTo} > 0))::int`,
    })
    .from(partnerServices)
    .innerJoin(services, eq(services.id, partnerServices.serviceId))
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .innerJoin(partners, eq(partners.id, partnerServices.partnerId))
    .where(and(eq(partners.accountStatus, "active"), published))
    .groupBy(services.id, categories.id)
    .orderBy(asc(categories.sortOrder), asc(services.name));
}

/**
 * Il servizio da mostrare se non ne è stato scelto uno: un lavoro a corpo (non una provvigione in %) con più
 * prezzi pubblicati.
 */
export function defaultService(list: PricedService[]): PricedService | null {
  const flat = list.filter((s) => s.unit === "flat");
  return (flat.length ? flat : list).reduce<PricedService | null>((best, s) => (!best || s.paidCount > best.paidCount ? s : best), null);
}

export type ServicePrice = {
  partnerId: string;
  displayName: string;
  href: string;
  municipalityName: string;
  provinceCode: string;
  provinceName: string;
  verified: boolean;
  rating: { average: number; count: number };
  from: number | null;
  to: number | null;
};

/**
 * Prezzi indicativi di un servizio pubblicati dai partner attivi, dal più economico. Si confrontano solo i
 * prezzi nell'unità più usata per quel servizio (a corpo, al m², all'ora…).
 */
export async function getServicePrices(categorySlug: string, serviceSlug: string) {
  await connection();
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

  const rows = await db
    .select({
      partnerId: partners.id,
      slug: partners.slug,
      displayName: partners.displayName,
      partnerType: partners.type,
      verified: sql<boolean>`${partners.verificationStatus} = 'verified'`,
      categorySlug: categories.slug,
      municipalityName: municipalities.name,
      provinceCode: provinces.code,
      provinceName: provinces.name,
      provinceSlug: provinces.slug,
      ratingAverage: sql<number>`coalesce(${ratingAgg.average}, 0)`,
      ratingCount: sql<number>`coalesce(${ratingAgg.count}, 0)`,
      serviceName: services.name,
      from: partnerServices.priceFrom,
      to: partnerServices.priceTo,
      unit: partnerServices.unit,
    })
    .from(partnerServices)
    .innerJoin(services, eq(services.id, partnerServices.serviceId))
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .innerJoin(partners, eq(partners.id, partnerServices.partnerId))
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
    .leftJoin(ratingAgg, eq(ratingAgg.partnerId, partners.id))
    .where(and(eq(partners.accountStatus, "active"), eq(categories.slug, categorySlug), eq(services.slug, serviceSlug), published));

  if (rows.length === 0) return null;
  const unitCount = new Map<PriceUnit, number>();
  for (const r of rows) unitCount.set(r.unit, (unitCount.get(r.unit) ?? 0) + 1);
  const unit = [...unitCount].sort((a, b) => b[1] - a[1])[0][0];

  const prices: ServicePrice[] = rows
    .filter((r) => r.unit === unit)
    .map((r) => ({
      partnerId: r.partnerId,
      displayName: r.displayName,
      href: profileHref({ partnerType: r.partnerType, provinceSlug: r.provinceSlug, categorySlug: r.categorySlug, slug: r.slug }),
      municipalityName: r.municipalityName,
      provinceCode: r.provinceCode,
      provinceName: r.provinceName,
      verified: r.verified,
      rating: { average: r.ratingAverage, count: r.ratingCount },
      from: r.from,
      to: r.to,
    }))
    .sort((a, b) => (a.from ?? a.to ?? 0) - (b.from ?? b.to ?? 0) || a.displayName.localeCompare(b.displayName, "it"));

  // Prezzo di partenza tipico per provincia (sede del partner).
  const byProvince = new Map<string, { code: string; name: string; lows: number[] }>();
  for (const p of prices) {
    const low = p.from ?? p.to;
    if (low === null) continue;
    const entry = byProvince.get(p.provinceCode) ?? { code: p.provinceCode, name: p.provinceName, lows: [] };
    entry.lows.push(low);
    byProvince.set(p.provinceCode, entry);
  }
  const provincesMedian = [...byProvince.values()]
    .map((p) => ({ code: p.code, name: p.name, median: median(p.lows), count: p.lows.length }))
    .sort((a, b) => b.median - a.median);

  return { serviceName: rows[0].serviceName, unit, prices, provinces: provincesMedian };
}

export type HousePriceArea = {
  municipalityName: string;
  municipalitySlug: string;
  provinceCode: string;
  summary: SqmSummary;
};

/**
 * Prezzo al metro quadro per comune, calcolato sugli immobili pubblicati nel portfolio delle agenzie attive.
 * Non è una quotazione ufficiale: vale quanto gli annunci da cui viene.
 */
export async function getHousePrices(contract: "sale" | "rent") {
  await connection();
  const rows = await db
    .select({
      municipalityName: municipalities.name,
      municipalitySlug: municipalities.slug,
      provinceCode: provinces.code,
      priceCents: portfolioItems.priceCents,
      sqm: portfolioItems.sqm,
    })
    .from(portfolioItems)
    .innerJoin(partners, eq(partners.id, portfolioItems.partnerId))
    .innerJoin(municipalities, eq(municipalities.id, portfolioItems.municipalityId))
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
    .where(
      and(
        eq(partners.accountStatus, "active"),
        eq(portfolioItems.kind, "property"),
        eq(portfolioItems.contract, contract),
        isNotNull(portfolioItems.priceCents),
        gt(portfolioItems.sqm, 0),
      ),
    );

  const byPlace = new Map<string, { name: string; slug: string; code: string; items: typeof rows }>();
  for (const r of rows) {
    const entry = byPlace.get(r.municipalitySlug) ?? { name: r.municipalityName, slug: r.municipalitySlug, code: r.provinceCode, items: [] };
    entry.items.push(r);
    byPlace.set(r.municipalitySlug, entry);
  }
  const areas: HousePriceArea[] = [...byPlace.values()]
    .flatMap((p) => {
      const summary = pricePerSqm(p.items);
      return summary ? [{ municipalityName: p.name, municipalitySlug: p.slug, provinceCode: p.code, summary }] : [];
    })
    .sort((a, b) => b.summary.average - a.summary.average);
  return { areas, overall: pricePerSqm(rows) };
}
