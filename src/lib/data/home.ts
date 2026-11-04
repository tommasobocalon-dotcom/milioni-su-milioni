import "server-only";
import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { db } from "@/lib/db/client";
import { boosts, categories, municipalities, partners, provinces } from "@/lib/db/schema";
import { profileHref } from "./search";

/** Numeri della hero, solo dal database: mai numeri inventati sulle pagine pubbliche. */
export type HomeStats = { reviews: number; average: number; partners: number; categories: number };

/** Sotto queste soglie la riga dei numeri non si mostra: pochi numeri piccoli non rassicurano nessuno. */
export const HOME_STATS_MIN = { reviews: 30, partners: 10 } as const;

export async function getHomeStats(): Promise<HomeStats> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const [row] = await db.execute<HomeStats>(sql`
    select (select count(*)::int from reviews where status = 'published') as reviews,
           (select coalesce(avg(rating), 0)::float from reviews where status = 'published') as average,
           (select count(*)::int from partners where verification_status = 'verified' and account_status = 'active') as partners,
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
 * Aziende "in evidenza" nella fascia loghi della Home: i partner attivi con un boost pagato a token
 * in corso adesso (PRD §7.3). L'ordine cambia a ogni visita, così nessuno sta sempre primo.
 */
export async function getHomeSponsors(limit = 16): Promise<HomeSponsor[]> {
  await connection();
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
    .where(and(lte(boosts.startsAt, now), gt(boosts.endsAt, now), eq(partners.accountStatus, "active")))
    .orderBy(asc(partners.id), desc(boosts.endsAt));

  return shuffle(rows)
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      displayName: r.displayName,
      logoUrl: r.logoUrl,
      categoryName: r.categoryName,
      municipalityName: r.municipalityName,
      href: profileHref(r),
    }));
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
