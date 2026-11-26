"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { findPlace, getOpenProvinceCodes } from "@/lib/data/catalog";
import { db } from "@/lib/db/client";
import { areaRequests, categories, provinces } from "@/lib/db/schema";
import { isProvinceOpen } from "@/lib/domain/open-areas";
import { normalizeEmail } from "@/lib/domain/otp";
import { ipRateLimited } from "@/lib/security/ip-limit";
import { TURNSTILE_ERROR, turnstileOk } from "@/lib/security/turnstile";

export type AreaRequestField = "category" | "place" | "email";
export type AreaRequestInput = { province: string } & Record<AreaRequestField, string>;
export type AreaRequestResult = { ok: true } | { ok: false; error: string; field?: AreaRequestField };

const Schema = z.object({
  province: z.string().trim().length(2),
  category: z.uuid({ error: "Scegli cosa cerchi" }),
  place: z.string().trim().max(80),
  email: z.string().transform(normalizeEmail).pipe(z.email("Controlla l'indirizzo email")),
});

/**
 * "Inoltra una richiesta" dalla mappa della Home: chi abita in una provincia non ancora attiva lascia cosa cerca
 * e la sua email. Si conta per provincia nel gestionale, per decidere dove aprire dopo Treviso.
 */
export async function sendAreaRequest(input: AreaRequestInput, turnstileToken?: string): Promise<AreaRequestResult> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path[0];
    return { ok: false, error: issue.message, field: field === "province" ? undefined : (field as AreaRequestField) };
  }
  const d = parsed.data;
  if (isProvinceOpen(d.province, await getOpenProvinceCodes())) return { ok: false, error: "In questa provincia geco è già attivo: cerca direttamente." };

  const [province] = await db.select({ id: provinces.id, name: provinces.name }).from(provinces).where(eq(provinces.code, d.province.toUpperCase()));
  if (!province) return { ok: false, error: "Provincia non trovata." };
  const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, d.category));
  if (!category) return { ok: false, error: "Scegli cosa cerchi", field: "category" };

  const place = d.place ? await findPlace(d.place) : null;
  if (d.place && place?.provinceId !== province.id) {
    return { ok: false, error: `Scegli un comune della provincia di ${province.name}, o lascia vuoto`, field: "place" };
  }

  if (await ipRateLimited("area_request", 10, 60)) return { ok: false, error: "Troppe richieste da questo dispositivo. Riprova tra un'ora." };
  if (!(await turnstileOk(turnstileToken))) return { ok: false, error: TURNSTILE_ERROR };

  // La stessa persona che chiede due volte la stessa cosa nella stessa provincia conta una volta sola.
  const [already] = await db
    .select({ id: areaRequests.id })
    .from(areaRequests)
    .where(and(eq(areaRequests.provinceId, province.id), eq(areaRequests.categoryId, category.id), eq(areaRequests.email, d.email)));
  if (!already) {
    await db.insert(areaRequests).values({ provinceId: province.id, municipalityId: place?.id ?? null, categoryId: category.id, email: d.email });
  }
  return { ok: true };
}
