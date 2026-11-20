import "server-only";
import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import { boosts, categories, municipalities, partnerServices, partners, provinces, services } from "@/lib/db/schema";
import { profileHref } from "./search";

export type HomeSponsor = {
  id: string;
  displayName: string;
  logoUrl: string | null;
  categoryName: string;
  municipalityName: string;
  href: string;
};

/**
 * Aziende "in evidenza" nella fascia loghi della Home: i partner attivi con un boost "home" pagato a token
 * in corso adesso (PRD §7.3). Nessun limite: ci stanno tutti. L'ordine lo mescola il browser a ogni visita
 * (SponsorMarquee), così nessuno sta sempre primo.
 */
export async function getHomeSponsors(): Promise<HomeSponsor[]> {
  "use cache";
  // Un boost che scade sparisce entro qualche minuto; uno nuovo compare subito (updateTag("boosts") in activateBoostAction).
  cacheLife("minutes");
  cacheTag("boosts", "catalog");
  const now = new Date();
  const rows = await db
    .selectDistinctOn([partners.id], {
      id: partners.id,
      slug: partners.slug,
      displayName: partners.displayName,
      logoUrl: partners.logoUrl,
      partnerType: partners.type,
      categoryName: categories.name,
      categorySlug: categories.slug,
      municipalityName: municipalities.name,
      provinceSlug: provinces.slug,
    })
    .from(boosts)
    .innerJoin(partners, eq(partners.id, boosts.partnerId))
    .innerJoin(categories, eq(categories.id, partners.categoryId))
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
    .where(and(eq(boosts.placement, "home"), lte(boosts.startsAt, now), gt(boosts.endsAt, now), eq(partners.accountStatus, "active")))
    .orderBy(asc(partners.id), desc(boosts.endsAt));

  return rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      logoUrl: r.logoUrl,
      categoryName: r.categoryName,
      municipalityName: r.municipalityName,
      href: profileHref(r),
    }));
}

/**
 * Quante aziende attive ci sono per categoria e per servizio: la Home mostra solo le scorciatoie che portano
 * ad almeno un risultato, così nessuna tessera finisce su una pagina vuota.
 */
export async function getActiveCounts(): Promise<{ byCategory: Record<string, number>; byService: Record<string, number> }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const [cats, svcs] = await Promise.all([
    db
      .select({ slug: categories.slug, n: sql<number>`count(${partners.id})::int` })
      .from(categories)
      .innerJoin(partners, and(eq(partners.categoryId, categories.id), eq(partners.accountStatus, "active")))
      .groupBy(categories.slug),
    db
      .select({ slug: services.slug, n: sql<number>`count(distinct ${partners.id})::int` })
      .from(services)
      .innerJoin(partnerServices, eq(partnerServices.serviceId, services.id))
      .innerJoin(partners, and(eq(partners.id, partnerServices.partnerId), eq(partners.accountStatus, "active")))
      .groupBy(services.slug),
  ]);
  return {
    byCategory: Object.fromEntries(cats.map((c) => [c.slug, c.n])),
    byService: Object.fromEntries(svcs.map((s) => [s.slug, s.n])),
  };
}
