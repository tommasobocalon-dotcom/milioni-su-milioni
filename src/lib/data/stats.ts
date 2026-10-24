import "server-only";
import { and, count, desc, eq, gt, isNotNull, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { boosts, leads, profileEvents } from "@/lib/db/schema";

type ProfileEventType = (typeof profileEvents.$inferInsert)["type"];

// ponytail: conta anche i bot; filtrare per user agent quando le statistiche diventano un criterio di fatturazione.
export async function recordProfileEvents(partnerIds: string[], type: ProfileEventType) {
  if (partnerIds.length === 0) return;
  await db.insert(profileEvents).values(partnerIds.map((partnerId) => ({ partnerId, type })));
}

export const STATS_DAYS = 30;

/** Statistiche della scheda negli ultimi 30 giorni. L'id del partner arriva sempre dalla sessione. */
export async function getPartnerStats(partnerId: string, now: Date) {
  const since = new Date(now.getTime() - STATS_DAYS * 86_400_000);
  const [events, [leadRow], boostRows] = await Promise.all([
    db
      .select({ type: profileEvents.type, n: count() })
      .from(profileEvents)
      .where(and(eq(profileEvents.partnerId, partnerId), gt(profileEvents.createdAt, since)))
      .groupBy(profileEvents.type),
    db
      .select({ n: count() })
      .from(leads)
      .where(and(eq(leads.partnerId, partnerId), isNotNull(leads.deliveredAt), ne(leads.charge, "duplicate"), gt(leads.createdAt, since))),
    db
      .select({
        id: boosts.id,
        startsAt: boosts.startsAt,
        endsAt: boosts.endsAt,
        tokensSpent: boosts.tokensSpent,
      })
      .from(boosts)
      .where(eq(boosts.partnerId, partnerId))
      .orderBy(desc(boosts.startsAt))
      .limit(10),
  ]);
  const by = Object.fromEntries(events.map((e) => [e.type, e.n])) as Partial<Record<ProfileEventType, number>>;
  return {
    impressions: by.impression ?? 0,
    views: by.view ?? 0,
    contactClicks: by.contact_click ?? 0,
    leads: leadRow?.n ?? 0,
    boosts: boostRows.map((b) => ({
      ...b,
      active: b.startsAt <= now && b.endsAt > now,
    })),
  };
}

/** Percentuale intera, 0 se il denominatore è 0. */
export const rate = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);
