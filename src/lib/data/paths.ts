import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import { categories, municipalities, partners, provinces } from "@/lib/db/schema";

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
