import type { MetadataRoute } from "next";

/** Aree private, moduli e API fuori dai motori di ricerca. Sul sito di prova risponde solo al team (SITE_ACCESS). */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/area-partner", "/area-cliente", "/admin", "/accedi", "/auth/", "/api/", "/richiesta/", "/registrazione-partner", "/cerca"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
