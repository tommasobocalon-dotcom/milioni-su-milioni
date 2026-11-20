import "server-only";
import { and, desc, eq, gt, isNotNull, lte, ne, notInArray, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";
import { categories, municipalities, partners, portfolioItems, provinces, showcaseFeatures } from "@/lib/db/schema";
import type { PropertyContract } from "@/lib/domain/property-contract";
import type { ShowcaseFilter } from "@/lib/domain/showcase-filter";
import { profileHref } from "./search";

export type ShowcaseItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  photos: string[];
  partnerName: string;
  partnerSlug: string;
  categoryName: string;
  place: string | null;
  href: string;
  sponsored: boolean;
  /** Immobile di un'agenzia (non un lavoro): contratto, prezzo e stato, se l'agenzia li ha scritti. */
  property: { contract: PropertyContract; priceCents: number | null; status: "available" | "negotiating" | "sold" | null } | null;
};

const workPlace = alias(municipalities, "work_place");

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
  // Il comune del lavoro o dell'immobile, se l'azienda l'ha scritto; altrimenti quello della sede.
  place: sql<string>`coalesce(${workPlace.name}, ${municipalities.name})`,
  contract: portfolioItems.contract,
  priceCents: portfolioItems.priceCents,
  status: portfolioItems.status,
};

function base() {
  return db
    .select(columns)
    .from(portfolioItems)
    .innerJoin(partners, eq(partners.id, portfolioItems.partnerId))
    .innerJoin(categories, eq(categories.id, partners.categoryId))
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
    .leftJoin(workPlace, eq(workPlace.id, portfolioItems.municipalityId));
}

type Row = Awaited<ReturnType<typeof base>>[number];

const toItem = (r: Row, sponsored: boolean): ShowcaseItem => ({
  id: r.id,
  title: r.title,
  description: r.description,
  imageUrl: r.imageUrl!,
  photos: r.photos.length ? r.photos : [r.imageUrl!],
  partnerName: r.partnerName,
  partnerSlug: r.partnerSlug,
  categoryName: r.categoryName,
  place: r.place,
  href: profileHref({ partnerType: r.partnerType, provinceSlug: r.provinceSlug, categorySlug: r.categorySlug, slug: r.partnerSlug }),
  sponsored,
  property: r.partnerType === "agency" && r.contract ? { contract: r.contract, priceCents: r.priceCents, status: r.status } : null,
});

/**
 * Pagina "Ispirazione": in cima i lavori messi in evidenza a pagamento (sempre "Sponsorizzato"),
 * sotto gli altri lavori con foto delle aziende attive, dai più recenti; `filter` dai filtri della pagina.
 */
export async function getShowcase(now: Date, filter: ShowcaseFilter = {}): Promise<{ featured: ShowcaseItem[]; latest: ShowcaseItem[] }> {
  const conditions: SQL[] = [eq(partners.accountStatus, "active"), isNotNull(portfolioItems.imageUrl), eq(portfolioItems.inInspiration, true)];
  if (filter.type === "pro") conditions.push(ne(partners.type, "agency"));
  if (filter.type === "agency") conditions.push(eq(partners.type, "agency"));
  if (filter.categorySlug) conditions.push(eq(categories.slug, filter.categorySlug));
  if (filter.contract) conditions.push(eq(portfolioItems.contract, filter.contract));
  const active = and(...conditions);
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

/** Un lavoro di Ispirazione per la sua pagina; null se non esiste, se l'azienda non è attiva o se l'ha lasciato solo nella scheda. */
export async function getShowcaseItem(id: string): Promise<ShowcaseItem | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await base().where(
    and(eq(portfolioItems.id, id), eq(partners.accountStatus, "active"), isNotNull(portfolioItems.imageUrl), eq(portfolioItems.inInspiration, true)),
  );
  return row ? toItem(row, false) : null;
}
