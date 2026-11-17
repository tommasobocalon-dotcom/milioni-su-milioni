import type { MetadataRoute } from "next";
import { listCategoryPlacePaths, listPublicPartnerPaths } from "@/lib/data/paths";
import { profileHref } from "@/lib/data/search";

const PAGES = [
  "/",
  "/trova-professionista",
  "/trova-casa",
  "/ispirazione",
  "/come-funziona",
  "/come-ordiniamo-i-risultati",
  "/per-i-professionisti",
  "/chi-siamo",
  "/assistenza",
  "/privacy",
  "/termini",
];

/** Pagine pubbliche, pagine categoria × comune con aziende e schede delle aziende attive, per i motori di ricerca (PRD §15). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const [partners, places] = await Promise.all([listPublicPartnerPaths(), listCategoryPlacePaths()]);
  return [
    ...PAGES.map((path) => ({ url: `${base}${path === "/" ? "" : path}` })),
    ...places.map((p) => ({ url: `${base}/${p.categorySlug}/${p.municipalitySlug}` })),
    ...partners.map((p) => ({ url: `${base}${profileHref({ partnerType: p.type, ...p })}` })),
  ];
}
