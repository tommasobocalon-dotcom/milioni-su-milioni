import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import { categories, municipalities, partners, provinces, services } from "@/lib/db/schema";
import { slugify } from "@/lib/domain/format";

export type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  pluralName: string;
  icon: string;
  partnerType: "agency" | "technician" | "artisan" | "b2b";
  partnerCount: number;
};

/** Categorie con il numero di partner attivi. Cambia di rado: cache di un'ora. */
export async function getCategories(): Promise<CategorySummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      pluralName: categories.pluralName,
      icon: categories.icon,
      partnerType: categories.partnerType,
      partnerCount: sql<number>`count(${partners.id})::int`,
    })
    .from(categories)
    .leftJoin(partners, and(eq(partners.categoryId, categories.id), eq(partners.accountStatus, "active")))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder));
}

export async function getCategoryBySlug(slug: string) {
  const all = await getCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function getServicesForCategory(categoryId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  return db
    .select({ id: services.id, slug: services.slug, name: services.name, defaultUnit: services.defaultUnit })
    .from(services)
    .where(eq(services.categoryId, categoryId))
    .orderBy(asc(services.name));
}

export type Place = {
  id: number;
  name: string;
  slug: string;
  aliases: string[];
  lat: number;
  lng: number;
  provinceId: number;
  provinceCode: string;
  provinceName: string;
  provinceSlug: string;
};

export async function getMunicipalities(): Promise<Place[]> {
  "use cache";
  cacheLife("days");
  cacheTag("catalog");
  return db
    .select({
      id: municipalities.id,
      name: municipalities.name,
      slug: municipalities.slug,
      aliases: municipalities.aliases,
      lat: municipalities.lat,
      lng: municipalities.lng,
      provinceId: provinces.id,
      provinceCode: provinces.code,
      provinceName: provinces.name,
      provinceSlug: provinces.slug,
    })
    .from(municipalities)
    .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
    .orderBy(asc(municipalities.name));
}

/** Trova un comune da quello che scrive la persona: nome, slug o frazione ("Mestre" → Venezia). */
export async function findPlace(query: string | undefined | null): Promise<Place | null> {
  if (!query) return null;
  const q = slugify(query.replace(/\(.*?\)/g, ""));
  if (!q) return null;
  const all = await getMunicipalities();
  return (
    all.find((m) => m.slug === q) ??
    all.find((m) => m.aliases.some((a) => slugify(a) === q)) ??
    all.find((m) => m.slug.startsWith(q) || m.aliases.some((a) => slugify(a).startsWith(q))) ??
    null
  );
}

export type ProvinceZone = { id: number; code: string; name: string; slug: string; label: string };

/** Le province del Veneto come voci del filtro Zona ("Provincia di Padova"), ricavate dai comuni. */
export async function getProvinceZones(): Promise<ProvinceZone[]> {
  const byId = new Map<number, ProvinceZone>();
  for (const m of await getMunicipalities()) {
    byId.set(m.provinceId, { id: m.provinceId, code: m.provinceCode, name: m.provinceName, slug: m.provinceSlug, label: `Provincia di ${m.provinceName}` });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "it"));
}

/** Zona dei filtri dei risultati: una provincia intera se si sceglie "Provincia di …", altrimenti un comune come findPlace. */
export async function findZone(query: string | undefined | null): Promise<{ place: Place | null; province: ProvinceZone | null }> {
  const q = slugify(query ?? "");
  const province = q.startsWith("provincia-di-") ? (await getProvinceZones()).find((p) => slugify(p.label) === q) ?? null : null;
  return { place: province ? null : await findPlace(query), province };
}

export async function getProvinceBySlug(slug: string) {
  const [row] = await db.select().from(provinces).where(and(eq(provinces.slug, slug))).limit(1);
  return row ?? null;
}
