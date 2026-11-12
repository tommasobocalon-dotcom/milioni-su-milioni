import "server-only";
import { and, desc, eq, gt, isNotNull, lte, notInArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, municipalities, partners, portfolioItems, provinces, showcaseFeatures } from "@/lib/db/schema";
import { profileHref } from "./search";

export type ShowcaseItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  photos: string[];
  partnerName: string;
  categoryName: string;
  place: string | null;
  href: string;
  sponsored: boolean;
};

const columns = {
  id: portfolioItems.id,
  title: portfolioItems.title,
  description: portfolioItems.description,
  imageUrl: portfolioItems.imageUrl,
  photos: portfolioItems.photos,
  partnerName: partners.displayName,
  partnerSlug: partners.slug,
  partnerType: partners.type,
  categoryName: categories.name,
  categorySlug: categories.slug,
  provinceSlug: provinces.slug,
  place: municipalities.name,
};

function base() {
  return db
    .select(columns)
    .from(portfolioItems)
    .innerJoin(partners, eq(partners.id, portfolioItems.partnerId))
    .innerJoin(categories, eq(categories.id, partners.categoryId))
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId));
}

type Row = Awaited<ReturnType<typeof base>>[number];

const toItem = (r: Row, sponsored: boolean): ShowcaseItem => ({
  id: r.id,
  title: r.title,
  description: r.description,
  imageUrl: r.imageUrl!,
  photos: r.photos.length ? r.photos : [r.imageUrl!],
  partnerName: r.partnerName,
  categoryName: r.categoryName,
  place: r.place,
  href: profileHref({ partnerType: r.partnerType, provinceSlug: r.provinceSlug, categorySlug: r.categorySlug, slug: r.partnerSlug }),
  sponsored,
});

/**
 * Pagina "Ispirazione": in cima i lavori messi in evidenza a pagamento (sempre "Sponsorizzato"),
 * sotto gli altri lavori con foto delle aziende attive, dai più recenti.
 */
export async function getShowcase(now: Date): Promise<{ featured: ShowcaseItem[]; latest: ShowcaseItem[] }> {
  const active = and(eq(partners.accountStatus, "active"), isNotNull(portfolioItems.imageUrl));
  const featuredRows = await base()
    .innerJoin(showcaseFeatures, eq(showcaseFeatures.portfolioItemId, portfolioItems.id))
    .where(and(active, lte(showcaseFeatures.startsAt, now), gt(showcaseFeatures.endsAt, now)))
    .orderBy(desc(showcaseFeatures.startsAt));
  const featured = [...new Map(featuredRows.map((r) => [r.id, toItem(r, true)])).values()];
  const latestRows = await base()
    .where(featured.length ? and(active, notInArray(portfolioItems.id, featured.map((f) => f.id))) : active)
    .orderBy(desc(portfolioItems.createdAt))
    .limit(24);
  return { featured, latest: latestRows.map((r) => toItem(r, false)) };
}
