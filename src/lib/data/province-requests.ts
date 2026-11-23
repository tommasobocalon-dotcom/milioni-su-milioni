import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { municipalities, provinceRequests, provinces } from "@/lib/db/schema";
import type { ProvinceNeed } from "@/lib/domain/coverage";

/**
 * Richieste delle province dove il sito non è ancora attivo (mappa della Home). Servono a scegliere dove aprire dopo
 * Treviso: il gestionale le conta per provincia. Una richiesta per email e provincia, aggiornata se la persona la rimanda.
 */

export async function saveProvinceRequest(r: { provinceId: number; municipalityId: number | null; need: ProvinceNeed; note: string | null; email: string }) {
  await db
    .insert(provinceRequests)
    .values(r)
    .onConflictDoUpdate({
      target: [provinceRequests.provinceId, provinceRequests.email],
      set: { municipalityId: r.municipalityId, need: r.need, note: r.note, updatedAt: sql`now()` },
    });
}

const DAY = 86_400_000;

export type ProvinceDemand = { code: string; name: string; total: number; recent: number; professional: number; agency: number };

/** Quante richieste per provincia (tutte le province, anche a zero), le più richieste prima. `recent` = ultimi 30 giorni. */
export async function getProvinceDemand(now: Date): Promise<ProvinceDemand[]> {
  const since = new Date(now.getTime() - 30 * DAY).toISOString();
  const total = sql<number>`count(${provinceRequests.id})::int`;
  return db
    .select({
      code: provinces.code,
      name: provinces.name,
      total,
      recent: sql<number>`(count(${provinceRequests.id}) filter (where ${provinceRequests.createdAt} >= ${since}))::int`,
      professional: sql<number>`(count(${provinceRequests.id}) filter (where ${provinceRequests.need} = 'professional'))::int`,
      agency: sql<number>`(count(${provinceRequests.id}) filter (where ${provinceRequests.need} = 'agency'))::int`,
    })
    .from(provinces)
    .leftJoin(provinceRequests, eq(provinceRequests.provinceId, provinces.id))
    .groupBy(provinces.id)
    .orderBy(desc(total), asc(provinces.name));
}

export type ProvinceRequestRow = {
  id: string;
  provinceName: string;
  municipality: string | null;
  need: ProvinceNeed;
  note: string | null;
  email: string;
  createdAt: Date;
};

/** Ultime richieste, eventualmente di una sola provincia (sigla). */
export async function listProvinceRequests(provinceCode?: string, limit = 200): Promise<ProvinceRequestRow[]> {
  return db
    .select({
      id: provinceRequests.id,
      provinceName: provinces.name,
      municipality: municipalities.name,
      need: provinceRequests.need,
      note: provinceRequests.note,
      email: provinceRequests.email,
      createdAt: provinceRequests.createdAt,
    })
    .from(provinceRequests)
    .innerJoin(provinces, eq(provinces.id, provinceRequests.provinceId))
    .leftJoin(municipalities, eq(municipalities.id, provinceRequests.municipalityId))
    .where(provinceCode ? eq(provinces.code, provinceCode) : undefined)
    .orderBy(desc(provinceRequests.updatedAt))
    .limit(limit);
}
