import "server-only";
import { and, count, desc, eq, gte, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { boosts, leads, municipalities, profileEvents, services } from "@/lib/db/schema";
import { dayKeys, fillDaily, type StatsPeriod } from "@/lib/domain/stats";

type ProfileEventType = (typeof profileEvents.$inferInsert)["type"];

// ponytail: conta anche i bot; filtrare per user agent quando le statistiche diventano un criterio di fatturazione.
export async function recordProfileEvents(partnerIds: string[], type: ProfileEventType) {
  if (partnerIds.length === 0) return;
  await db.insert(profileEvents).values(partnerIds.map((partnerId) => ({ partnerId, type })));
}

const romeDaySql = (col: typeof profileEvents.createdAt | typeof leads.createdAt) =>
  sql<string>`to_char(${col} at time zone 'Europe/Rome', 'YYYY-MM-DD')`;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export type StatsSeries = { impressions: number[]; views: number[]; contactClicks: number[]; leads: number[] };

/**
 * Statistiche della scheda negli ultimi `days` giorni, con i totali del periodo precedente
 * della stessa durata per il confronto. L'id del partner arriva sempre dalla sessione.
 */
export async function getPartnerStats(partnerId: string, now: Date, days: StatsPeriod) {
  // Periodo + quello precedente, e almeno 90 giorni per misurare l'effetto dei boost passati.
  const span = Math.max(days * 2, 90);
  const keys = dayKeys(now, span);
  // Un giorno di margine per il fuso orario: le righe fuori dai giorni elencati le scarta fillDaily.
  const since = new Date(Date.parse(keys[0]) - 86_400_000);
  const current = keys.slice(span - days);
  const visibleLeads = and(eq(leads.partnerId, partnerId), isNotNull(leads.deliveredAt), ne(leads.charge, "duplicate"));
  const inPeriod = and(visibleLeads, gte(leads.createdAt, since), gte(romeDaySql(leads.createdAt), current[0]));

  const [eventRows, leadRows, byStatus, byPlace, byService, boostRows] = await Promise.all([
    db
      .select({ type: profileEvents.type, day: romeDaySql(profileEvents.createdAt), n: count() })
      .from(profileEvents)
      .where(and(eq(profileEvents.partnerId, partnerId), gte(profileEvents.createdAt, since)))
      .groupBy(profileEvents.type, romeDaySql(profileEvents.createdAt)),
    db
      .select({ day: romeDaySql(leads.createdAt), n: count() })
      .from(leads)
      .where(and(visibleLeads, gte(leads.createdAt, since)))
      .groupBy(romeDaySql(leads.createdAt)),
    db.select({ status: leads.status, n: count() }).from(leads).where(inPeriod).groupBy(leads.status),
    db
      .select({ label: municipalities.name, n: count() })
      .from(leads)
      .innerJoin(municipalities, eq(municipalities.id, leads.municipalityId))
      .where(inPeriod)
      .groupBy(municipalities.name)
      .orderBy(desc(count()), municipalities.name)
      .limit(5),
    db
      .select({ label: sql<string>`coalesce(${services.name}, ${leads.requestType})`, n: count() })
      .from(leads)
      .leftJoin(services, eq(services.id, leads.serviceId))
      .where(inPeriod)
      .groupBy(sql`coalesce(${services.name}, ${leads.requestType})`)
      .orderBy(desc(count()))
      .limit(5),
    db
      .select({ id: boosts.id, placement: boosts.placement, startsAt: boosts.startsAt, endsAt: boosts.endsAt, tokensSpent: boosts.tokensSpent })
      .from(boosts)
      .where(eq(boosts.partnerId, partnerId))
      .orderBy(desc(boosts.startsAt))
      .limit(10),
  ]);

  const daily = (type: ProfileEventType) =>
    fillDaily(
      eventRows.filter((r) => r.type === type),
      keys,
    );
  const all: StatsSeries = {
    impressions: daily("impression"),
    views: daily("view"),
    contactClicks: daily("contact_click"),
    leads: fillDaily(leadRows, keys),
  };
  const split = <T extends Record<string, number[]>>(s: T, from: number, to: number) =>
    Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.slice(from, to)])) as T;
  const series = split(all, span - days, span);
  const previous = split(all, span - days * 2, span - days);
  const totals = (s: StatsSeries) => ({
    impressions: sum(s.impressions),
    views: sum(s.views),
    contactClicks: sum(s.contactClicks),
    leads: sum(s.leads),
  });

  return {
    days: current,
    /** Ultimi 90 giorni (o più), per stimare l'effetto dei boost. */
    history: { days: keys.slice(-90), views: all.views.slice(-90) },
    series,
    totals: totals(series),
    previousTotals: totals(previous),
    leadsByStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Partial<Record<(typeof byStatus)[number]["status"], number>>,
    topPlaces: byPlace,
    topServices: byService,
    boosts: boostRows.map((b) => ({ ...b, active: b.startsAt <= now && b.endsAt > now, upcoming: b.startsAt > now })),
  };
}

export type PartnerStats = Awaited<ReturnType<typeof getPartnerStats>>;
