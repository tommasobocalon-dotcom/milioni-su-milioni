import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db/client";
import { categories, municipalities, partners, provinces, reviews } from "@/lib/db/schema";
import { distanceKm } from "@/lib/domain/format";
import { bearingDeg } from "@/lib/domain/nearby";
import { profileHref } from "./search";

export type NearbyPartner = {
  id: string;
  displayName: string;
  href: string;
  contactHref: string;
  categoryName: string;
  municipalityName: string;
  provinceCode: string;
  verified: boolean;
  rating: { average: number; count: number };
  responseMinutes: number | null;
  distanceKm: number;
  bearing: number;
};

/** Partner attivi con sede entro radiusKm dal punto, dal più vicino. */
export async function getPartnersNear(center: { lat: number; lng: number }, radiusKm: number, categorySlug?: string): Promise<NearbyPartner[]> {
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
      id: partners.id,
      slug: partners.slug,
      displayName: partners.displayName,
      partnerType: partners.type,
      lat: partners.lat,
      lng: partners.lng,
      responseMinutes: partners.responseMinutes,
      verified: sql<boolean>`${partners.verificationStatus} = 'verified'`,
      categoryName: categories.name,
      categorySlug: categories.slug,
      municipalityName: municipalities.name,
      provinceCode: provinces.code,
      provinceSlug: provinces.slug,
      ratingAverage: sql<number>`coalesce(${ratingAgg.average}, 0)`,
      ratingCount: sql<number>`coalesce(${ratingAgg.count}, 0)`,
    })
    .from(partners)
    .innerJoin(categories, eq(categories.id, partners.categoryId))
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
    .leftJoin(ratingAgg, eq(ratingAgg.partnerId, partners.id))
    .where(and(eq(partners.accountStatus, "active"), categorySlug ? eq(categories.slug, categorySlug) : undefined));

  return rows
    .map((r) => ({
      id: r.id,
      displayName: r.displayName,
      href: profileHref(r),
      contactHref: `/richiesta/${r.slug}`,
      categoryName: r.categoryName,
      municipalityName: r.municipalityName,
      provinceCode: r.provinceCode,
      verified: r.verified,
      rating: { average: r.ratingAverage, count: r.ratingCount },
      responseMinutes: r.responseMinutes,
      distanceKm: distanceKm(center, r),
      bearing: bearingDeg(center, r),
    }))
    .filter((p) => p.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
