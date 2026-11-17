import "server-only";
import { and, eq, gt, inArray, lte, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db/client";
import {
  areaExtensions,
  boosts,
  categories,
  municipalities,
  partners,
  partnerServices,
  plans,
  portfolioItems,
  provinces,
  serviceAreas,
  services,
  subscriptions,
} from "@/lib/db/schema";
import { distanceKm, formatPriceRange, type PriceUnit } from "@/lib/domain/format";
import { canBoost, rankListing } from "@/lib/domain/ranking";
import { findPlace, type Place } from "./catalog";
import { recordProfileEvents } from "./stats";
import { pageItems } from "@/lib/domain/pagination";

export type SortKey = "rilevanza" | "distanza" | "prezzo";

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
  responseMinutes: number | null;
  planCode: string | null;
  verified: boolean;
  price: { label: string; serviceName: string; fromCents: number | null } | null;
  portfolioCount: number;
  /** Prima foto del portfolio, per il riquadro grande in cima. */
  coverUrl: string | null;
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
  /** Provincia intera (filtro "Provincia di …"): al posto di `place`, senza distanza. */
  provinceId?: number;
  sort?: SortKey;
  /** Con `page` i risultati sono tagliati a `pageSize` per pagina, `firstPageSize` nella prima (dove c'è anche il riquadro in evidenza). */
  page?: number;
  pageSize?: number;
  firstPageSize?: number;
  /** Rotazione dell'ordine tra pari grado del visitatore (visitorRotation in ranking.ts). */
  visitorSeed?: string;
}): Promise<{ featured: PartnerListItem | null; results: PartnerListItem[]; total: number; page: number; pages: number }> {
  "use cache";
  // In cache per filtri + rotazione: un boost nuovo compare subito (updateTag("boosts")), il resto entro un minuto circa.
  cacheLife("minutes");
  cacheTag("catalog", "boosts");
  const visitorSeed = input.visitorSeed ?? "";
  const now = new Date();

  const conditions = [eq(partners.accountStatus, "active")];
  if (input.categoryId) conditions.push(eq(partners.categoryId, input.categoryId));
  if (input.partnerType === "agency") conditions.push(eq(partners.type, "agency"));
  if (input.partnerType === "pro") conditions.push(sql`${partners.type} <> 'agency'`);
  if (input.place) {
    // Il partner serve il comune cercato o tutta la sua provincia, oppure ha comprato l'estensione territoriale a quel comune.
    conditions.push(
      sql`(exists (select 1 from ${serviceAreas} sa where sa.partner_id = ${partners.id}
        and (sa.municipality_id = ${input.place.id} or sa.province_id = ${input.place.provinceId}))
        or exists (select 1 from ${areaExtensions} ae where ae.partner_id = ${partners.id}
        and ae.municipality_id = ${input.place.id}
        and ae.starts_at <= ${now.toISOString()}::timestamptz and ae.ends_at > ${now.toISOString()}::timestamptz))`,
    );
  } else if (input.provinceId) {
    // Provincia intera: il partner serve la provincia o almeno un suo comune, anche con l'estensione territoriale.
    const inProvince = sql`(select m.id from ${municipalities} m where m.province_id = ${input.provinceId})`;
    conditions.push(
      sql`(exists (select 1 from ${serviceAreas} sa where sa.partner_id = ${partners.id}
        and (sa.province_id = ${input.provinceId} or sa.municipality_id in ${inProvince}))
        or exists (select 1 from ${areaExtensions} ae where ae.partner_id = ${partners.id}
        and ae.municipality_id in ${inProvince}
        and ae.starts_at <= ${now.toISOString()}::timestamptz and ae.ends_at > ${now.toISOString()}::timestamptz))`,
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
      planCode: plans.code,
      planWeight: plans.visibilityWeight,
      portfolioCount: sql<number>`(select count(*)::int from ${portfolioItems} pi where pi.partner_id = ${partners.id})`,
      coverUrl: sql<string | null>`(select pi.image_url from ${portfolioItems} pi where pi.partner_id = ${partners.id} and pi.image_url is not null order by pi.sort_order, pi.created_at limit 1)`,
    })
    .from(partners)
    .innerJoin(categories, eq(categories.id, partners.categoryId))
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
    .leftJoin(subscriptions, and(eq(subscriptions.partnerId, partners.id), eq(subscriptions.status, "active")))
    .leftJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(...conditions));

  if (rows.length === 0) return { featured: null, results: [], total: 0, page: 1, pages: 1 };
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

  // Boost "Sponsorizzato nella ricerca" attivi per la categoria nella provincia cercata (quelli della Home non contano qui).
  const boosted = new Set<string>();
  const boostProvince = input.place?.provinceId ?? input.provinceId;
  if (boostProvince) {
    const active = await db
      .select({ partnerId: boosts.partnerId })
      .from(boosts)
      .where(
        and(
          inArray(boosts.partnerId, ids),
          eq(boosts.placement, "search"),
          eq(boosts.provinceId, boostProvince),
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
      const planWeight = r.planWeight ?? 1;
      const item: PartnerListItem & { planWeight: number; boosted: boolean } = {
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
        responseMinutes: r.responseMinutes,
        planCode: r.planCode,
        verified: r.verified,
        price: price && label ? { label, serviceName: price.serviceName, fromCents: price.priceFrom } : null,
        portfolioCount: r.portfolioCount,
        coverUrl: r.coverUrl,
        distanceKm: dist,
        sponsored: boosted.has(r.id) && canBoost(planWeight),
        lat: r.lat,
        lng: r.lng,
        planWeight,
        boosted: boosted.has(r.id),
      };
      return item;
    });

  // Classifica decisa dal cliente (ranking.ts): riquadro grande per un Premium, poi per piano e boost.
  const ranked = rankListing(items, visitorSeed);
  const sorters: Record<Exclude<SortKey, "rilevanza">, (a: (typeof items)[number], b: (typeof items)[number]) => number> = {
    // Chi non ha distanza o prezzo va in fondo; Infinity - Infinity darebbe NaN e rovinerebbe l'ordinamento.
    distanza: (a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE),
    prezzo: (a, b) => (a.price?.fromCents ?? Number.MAX_VALUE) - (b.price?.fromCents ?? Number.MAX_VALUE),
  };
  const sort = input.sort ?? "rilevanza";
  const sorted = sort === "rilevanza" ? ranked.results : [...ranked.results].sort(sorters[sort]);
  const total = sorted.length + (ranked.featured ? 1 : 0);
  const paged = input.page ? pageItems(sorted, input.page, input.pageSize ?? 10, input.firstPageSize) : { items: sorted, page: 1, pages: 1 };
  const featured = paged.page === 1 ? ranked.featured : null;
  const results = paged.items;

  const strip = (i: (typeof items)[number]): PartnerListItem => {
    const out: Partial<typeof i> = { ...i };
    delete out.planWeight;
    delete out.boosted;
    return out as PartnerListItem;
  };
  return {
    // Il riquadro grande è un posto a pagamento: sempre etichettato "Sponsorizzato" (P2B, Omnibus).
    featured: featured ? { ...strip(featured), sponsored: true } : null,
    results: results.map(strip),
    total,
    page: paged.page,
    pages: paged.pages,
  };
}

/** Impressioni delle schede mostrate in questa pagina, scritte dopo aver mandato la risposta (non rallentano la pagina). */
export function recordImpressions(r: { featured: PartnerListItem | null; results: PartnerListItem[] }) {
  const ids = [...(r.featured ? [r.featured] : []), ...r.results].map((i) => i.id);
  after(() => recordProfileEvents(ids, "impression"));
}

/**
 * Altre aziende della stessa categoria vicine al comune di una richiesta, esclusa quella già scelta (pagina di conferma
 * e "Com'è andata?"). Chi la chiama deve aver già fatto `await connection()`: registra le impressioni.
 */
export async function alternativesTo(lead: { categoryId: string; municipality: string; partnerId: string }, limit: number) {
  const found = await searchPartners({ categoryId: lead.categoryId, place: await findPlace(lead.municipality) });
  recordImpressions(found);
  return [...(found.featured ? [found.featured] : []), ...found.results].filter((p) => p.id !== lead.partnerId).slice(0, limit);
}
