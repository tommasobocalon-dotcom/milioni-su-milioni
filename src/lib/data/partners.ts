import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import {
  categories,
  municipalities,
  partners,
  partnerServices,
  plans,
  portfolioItems,
  provinces,
  serviceAreas,
  serviceQuestions,
  services,
  subscriptions,
} from "@/lib/db/schema";
import { listCategoryPlacePaths } from "./paths";
import { profileHref } from "./search";

/** Scheda pubblica completa di un partner. Cache breve: i dati li aggiorna il partner. */
export async function getPartnerProfile(slug: string) {
  "use cache";
  cacheLife("minutes");
  // "catalog": nome della categoria e domande del modulo cambiano dal gestionale → Categorie.
  cacheTag(`partner:${slug}`, "catalog");

  const [p] = await db
    .select({
      id: partners.id,
      slug: partners.slug,
      type: partners.type,
      displayName: partners.displayName,
      logoUrl: partners.logoUrl,
      businessName: partners.businessName,
      vatNumber: partners.vatNumber,
      address: partners.address,
      tagline: partners.tagline,
      description: partners.description,
      specialties: partners.specialties,
      foundedYear: partners.foundedYear,
      openingHours: partners.openingHours,
      responseMinutes: partners.responseMinutes,
      hideDirectContacts: partners.hideDirectContacts,
      phone: partners.phone,
      email: partners.email,
      verified: sql<boolean>`${partners.verificationStatus} = 'verified'`,
      accountStatus: partners.accountStatus,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryPlural: categories.pluralName,
      categorySlug: categories.slug,
      municipalityId: partners.municipalityId,
      municipalityName: municipalities.name,
      municipalitySlug: municipalities.slug,
      provinceName: provinces.name,
      provinceCode: provinces.code,
      provinceSlug: provinces.slug,
    })
    .from(partners)
    .innerJoin(categories, eq(categories.id, partners.categoryId))
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
    .where(eq(partners.slug, slug))
    .limit(1);
  if (!p) return null;

  const [priceList, areas, portfolio, plan, placePaths] = await Promise.all([
    db
      .select({
        id: partnerServices.id,
        serviceName: services.name,
        priceFrom: partnerServices.priceFrom,
        priceTo: partnerServices.priceTo,
        unit: partnerServices.unit,
        notes: partnerServices.notes,
      })
      .from(partnerServices)
      .innerJoin(services, eq(services.id, partnerServices.serviceId))
      .where(eq(partnerServices.partnerId, p.id))
      .orderBy(asc(partnerServices.sortOrder)),
    db
      .select({
        municipality: municipalities.name,
        province: provinces.name,
      })
      .from(serviceAreas)
      .leftJoin(municipalities, eq(municipalities.id, serviceAreas.municipalityId))
      .leftJoin(provinces, eq(provinces.id, serviceAreas.provinceId))
      .where(eq(serviceAreas.partnerId, p.id)),
    db
      .select({
        id: portfolioItems.id,
        kind: portfolioItems.kind,
        title: portfolioItems.title,
        municipality: municipalities.name,
        contract: portfolioItems.contract,
        priceCents: portfolioItems.priceCents,
        sqm: portfolioItems.sqm,
        rooms: portfolioItems.rooms,
        hasBeforeAfter: portfolioItems.hasBeforeAfter,
        description: portfolioItems.description,
        status: portfolioItems.status,
        imageUrl: portfolioItems.imageUrl,
        photos: portfolioItems.photos,
        videoUrl: portfolioItems.videoUrl,
      })
      .from(portfolioItems)
      .leftJoin(municipalities, eq(municipalities.id, portfolioItems.municipalityId))
      .where(eq(portfolioItems.partnerId, p.id))
      .orderBy(asc(portfolioItems.sortOrder)),
    db
      .select({ code: plans.code, name: plans.name })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(and(eq(subscriptions.partnerId, p.id), eq(subscriptions.status, "active")))
      .limit(1),
    listCategoryPlacePaths(),
  ]);
  // Pagina "categoria × comune" della sede (es. /idraulico/padova), solo se esiste: link interno per i motori di ricerca.
  const hasLocalPage = placePaths.some((x) => x.categorySlug === p.categorySlug && x.municipalitySlug === p.municipalitySlug);

  return {
    ...p,
    href: profileHref({ partnerType: p.type, provinceSlug: p.provinceSlug, categorySlug: p.categorySlug, slug: p.slug }),
    localHref: hasLocalPage ? `/${p.categorySlug}/${p.municipalitySlug}` : null,
    planCode: plan[0]?.code ?? null,
    priceList,
    areas: areas.map((a) => (a.province ? `Provincia di ${a.province}` : a.municipality!)),
    portfolio,
  };
}

export type PartnerProfile = NonNullable<Awaited<ReturnType<typeof getPartnerProfile>>>;

/** Dati per il modulo di richiesta di contatto verso un partner. */
export async function getRequestContext(slug: string) {
  "use cache";
  cacheLife("minutes");
  // "catalog": nome della categoria e domande del modulo cambiano dal gestionale → Categorie.
  cacheTag(`partner:${slug}`, "catalog");
  const [p] = await db
    .select({
      id: partners.id,
      slug: partners.slug,
      type: partners.type,
      displayName: partners.displayName,
      logoUrl: partners.logoUrl,
      accountStatus: partners.accountStatus,
      responseMinutes: partners.responseMinutes,
      municipalityName: municipalities.name,
      provinceSlug: provinces.slug,
      categoryId: categories.id,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(partners)
    .innerJoin(categories, eq(categories.id, partners.categoryId))
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
    .where(eq(partners.slug, slug))
    .limit(1);
  if (!p) return null;
  const href = profileHref({ partnerType: p.type, provinceSlug: p.provinceSlug, categorySlug: p.categorySlug, slug: p.slug });

  const [offered, questions] = await Promise.all([
    db
      .select({ id: services.id, name: services.name, slug: services.slug })
      .from(partnerServices)
      .innerJoin(services, eq(services.id, partnerServices.serviceId))
      .where(eq(partnerServices.partnerId, p.id))
      .orderBy(asc(partnerServices.sortOrder)),
    db
      .select({
        key: serviceQuestions.key,
        label: serviceQuestions.label,
        help: serviceQuestions.help,
        type: serviceQuestions.type,
        options: serviceQuestions.options,
        required: serviceQuestions.required,
      })
      .from(serviceQuestions)
      .where(eq(serviceQuestions.categoryId, p.categoryId))
      .orderBy(asc(serviceQuestions.sortOrder)),
  ]);

  return { partner: { ...p, href }, services: offered, questions };
}

export type RequestContext = NonNullable<Awaited<ReturnType<typeof getRequestContext>>>;
