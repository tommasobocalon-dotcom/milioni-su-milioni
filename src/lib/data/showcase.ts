import "server-only";
import { and, desc, eq, gt, inArray, isNotNull, lte, ne, notInArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, municipalities, partnerFollows, partners, portfolioItems, portfolioLikes, provinces, showcaseFeatures } from "@/lib/db/schema";
import type { ShowcaseFilter } from "@/lib/domain/showcase-filter";
import { profileHref } from "./search";

export type ShowcaseItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  photos: string[];
  partnerId: string;
  partnerName: string;
  partnerSlug: string;
  partnerLogoUrl: string | null;
  categoryName: string;
  place: string | null;
  href: string;
  sponsored: boolean;
  /** Quanti account hanno messo "mi piace" al lavoro. */
  likes: number;
};

const columns = {
  id: portfolioItems.id,
  title: portfolioItems.title,
  description: portfolioItems.description,
  imageUrl: portfolioItems.imageUrl,
  photos: portfolioItems.photos,
  partnerId: partners.id,
  partnerName: partners.displayName,
  partnerSlug: partners.slug,
  partnerLogoUrl: partners.logoUrl,
  partnerType: partners.type,
  categoryName: categories.name,
  categorySlug: categories.slug,
  provinceSlug: provinces.slug,
  place: municipalities.name,
  likes: sql<number>`(select count(*)::int from ${portfolioLikes} where ${portfolioLikes.portfolioItemId} = ${portfolioItems.id})`,
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
  partnerId: r.partnerId,
  partnerName: r.partnerName,
  partnerSlug: r.partnerSlug,
  partnerLogoUrl: r.partnerLogoUrl,
  categoryName: r.categoryName,
  place: r.place,
  href: profileHref({ partnerType: r.partnerType, provinceSlug: r.provinceSlug, categorySlug: r.categorySlug, slug: r.partnerSlug }),
  sponsored,
  likes: r.likes,
});

/**
 * Pagina "Ispirazione": in cima i lavori messi in evidenza a pagamento (sempre "Sponsorizzato"),
 * sotto gli altri lavori con foto delle aziende attive, dai più recenti; `filter` dai filtri della pagina.
 * Con `filter.following` restano solo le aziende seguite da `viewerId`.
 */
export async function getShowcase(now: Date, filter: ShowcaseFilter = {}, viewerId?: string | null): Promise<{ featured: ShowcaseItem[]; latest: ShowcaseItem[] }> {
  // Scheda "Seguiti" senza accesso: non c'è nessuno di cui guardare le aziende seguite.
  if (filter.following && !viewerId) return { featured: [], latest: [] };
  const conditions: SQL[] = [eq(partners.accountStatus, "active"), isNotNull(portfolioItems.imageUrl)];
  if (filter.following && viewerId) {
    conditions.push(sql`exists (select 1 from ${partnerFollows} where ${partnerFollows.partnerId} = ${partners.id} and ${partnerFollows.userId} = ${viewerId})`);
  }
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

/** Un lavoro di Ispirazione per la sua pagina; null se non esiste o se l'azienda non è attiva. */
export async function getShowcaseItem(id: string): Promise<ShowcaseItem | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await base().where(and(eq(portfolioItems.id, id), eq(partners.accountStatus, "active"), isNotNull(portfolioItems.imageUrl)));
  return row ? toItem(row, false) : null;
}

/** Tra questi lavori, quelli a cui l'account ha già messo "mi piace". */
export async function getLikedIds(userId: string, itemIds: string[]): Promise<Set<string>> {
  if (itemIds.length === 0) return new Set();
  const rows = await db
    .select({ id: portfolioLikes.portfolioItemId })
    .from(portfolioLikes)
    .where(and(eq(portfolioLikes.userId, userId), inArray(portfolioLikes.portfolioItemId, itemIds)));
  return new Set(rows.map((r) => r.id));
}

/**
 * Mette o toglie il "mi piace" dell'account e restituisce il conto aggiornato. Dice lo stato voluto, non "inverti":
 * così due clic ravvicinati o una richiesta ripetuta non lo ribaltano.
 */
export async function setLike(userId: string, itemId: string, liked: boolean): Promise<number> {
  if (liked) await db.insert(portfolioLikes).values({ portfolioItemId: itemId, userId }).onConflictDoNothing();
  else await db.delete(portfolioLikes).where(and(eq(portfolioLikes.portfolioItemId, itemId), eq(portfolioLikes.userId, userId)));
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(portfolioLikes).where(eq(portfolioLikes.portfolioItemId, itemId));
  return row?.n ?? 0;
}
