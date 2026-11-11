import "server-only";
import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import { boosts, categories, municipalities, partners, provinces } from "@/lib/db/schema";
import { profileHref } from "./search";

/** Numeri della hero, solo dal database: mai numeri inventati sulle pagine pubbliche. */
export type HomeStats = { partners: number; categories: number };

/** Sotto queste soglie la riga dei numeri non si mostra: pochi numeri piccoli non rassicurano nessuno. */
export const HOME_STATS_MIN = { partners: 10 } as const;

export async function getHomeStats(): Promise<HomeStats> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const [row] = await db.execute<HomeStats>(sql`
    select (select count(*)::int from partners where verification_status = 'verified' and account_status = 'active') as partners,
           (select count(distinct category_id)::int from partners where account_status = 'active') as categories`);
  return row;
}

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
