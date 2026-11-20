import "server-only";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import { areaExtensions, categories, municipalities, partners, portfolioItems, provinces, serviceAreas } from "@/lib/db/schema";

/** Percorsi dei profili pubblici da prerenderizzare (pagine indicizzabili, PRD §5.4 e §15). */
export async function listPublicPartnerPaths() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  return db
    .select({ slug: partners.slug, type: partners.type, categorySlug: categories.slug, provinceSlug: provinces.slug })
    .from(partners)
    .innerJoin(categories, eq(categories.id, partners.categoryId))
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
    .where(eq(partners.accountStatus, "active"));
}

/**
 * Coppie categoria × comune con almeno un'azienda attiva che ci lavora (pagine /idraulico/padova, PRD §15): stessa
 * regola della zona nella ricerca (searchPartners), cioè il comune, tutta la sua provincia o un'estensione attiva.
 */
export async function listCategoryPlacePaths(): Promise<{ categorySlug: string; municipalitySlug: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  return db.execute<{ categorySlug: string; municipalitySlug: string }>(sql`
    with covered as (
      select p.category_id, sa.municipality_id as municipality_id
        from ${partners} p join ${serviceAreas} sa on sa.partner_id = p.id
        where p.account_status = 'active' and sa.municipality_id is not null
      union
      select p.category_id, m.id
        from ${partners} p join ${serviceAreas} sa on sa.partner_id = p.id join ${municipalities} m on m.province_id = sa.province_id
        where p.account_status = 'active'
      union
      select p.category_id, ae.municipality_id
        from ${partners} p join ${areaExtensions} ae on ae.partner_id = p.id
        where p.account_status = 'active' and ae.starts_at <= now() and ae.ends_at > now()
    )
    select c.slug as "categorySlug", m.slug as "municipalitySlug"
      from covered join ${categories} c on c.id = covered.category_id join ${municipalities} m on m.id = covered.municipality_id
      order by 1, 2`);
}

/** Lavori e immobili pubblici di Ispirazione (/ispirazione/[id]), con la data di pubblicazione per la sitemap. */
export async function listPublicWorkPaths(): Promise<{ id: string; createdAt: Date }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  return db
    .select({ id: portfolioItems.id, createdAt: portfolioItems.createdAt })
    .from(portfolioItems)
    .innerJoin(partners, eq(partners.id, portfolioItems.partnerId))
    .where(and(eq(partners.accountStatus, "active"), isNotNull(portfolioItems.imageUrl), eq(portfolioItems.inInspiration, true)));
}
