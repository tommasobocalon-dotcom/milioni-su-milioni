import type { MetadataRoute } from "next";
import { listPublicPartnerPaths } from "@/lib/data/paths";
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

/** Pagine pubbliche e schede delle aziende attive, per i motori di ricerca (PRD §15). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const partners = await listPublicPartnerPaths();
  return [
    ...PAGES.map((path) => ({ url: `${base}${path === "/" ? "" : path}` })),
    ...partners.map((p) => ({ url: `${base}${profileHref({ partnerType: p.type, ...p })}` })),
  ];
}
