import "server-only";
import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, ne, not, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  areaRequests,
  auditLogs,
  categories,
  leads,
  municipalities,
  partnerMembers,
  partners,
  plans,
  provinces,
  subscriptions,
  supportTickets,
  users,
} from "@/lib/db/schema";
import { profileHref } from "@/lib/data/search";
import { listTickets } from "@/lib/data/support";
import { monthlyRecurringCents } from "@/lib/domain/admin";

/** Nome del piano nel gestionale: il piano gratuito di lancio è un Base senza pagamento. */
const planLabel = sql<string>`case when ${subscriptions.free} then 'Gratuito' else ${plans.name} end`;

/** Letture del Backoffice (PRD §10). Ogni pagina che le usa passa prima da requireAdmin(). */

const DAY = 86_400_000;
const like = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

export type AccountStatus = (typeof partners.accountStatus.enumValues)[number];
export const ACCOUNT_STATUSES: { value: AccountStatus; label: string }[] = [
  { value: "active", label: "Attivi" },
  { value: "activating", label: "In attivazione" },
  { value: "suspended", label: "Sospesi" },
  { value: "cancelled", label: "Disdetti" },
];

type OverviewCounters = {
  active: number;
  activating: number;
  suspended: number;
  cancelled: number;
  to_verify: number;
  new_partners: number;
  new_partners_prev: number;
  stuck_activating: number;
  free_subs: number;
  paid_subs: {
    plan: string;
    period: "monthly" | "yearly";
    monthlyPriceCents: number;
    yearlyPriceCents: number;
  }[];
  leads_created: number;
  leads_verified: number;
  leads_verified_prev: number;
  leads_daily: { day: string; n: number }[];
  leads_delivered: number;
  leads_unconfirmed: number;
  leads_locked: number;
  leads_not_delivered: number;
  open_reports: number;
  open_tickets: number;
  home_active: number;
  search_active: number;
  extensions_active: number;
  sponsorships_ending: number;
  free_at_limit: number;
  by_plan: { name: string; n: number }[];
  by_province: { name: string; n: number }[];
  by_category: { name: string; n: number }[];
};

/**
 * Panoramica in tre letture invece di undici: sul database remoto ogni lettura è un viaggio di rete e il pool ha
 * 5 connessioni, quindi i contatori stanno tutti in una sola query.
 */
export async function getAdminOverview(now: Date) {
  const at = (ms: number) => new Date(now.getTime() + ms).toISOString();
  const t = now.toISOString();
  const [counters, openTickets, recentPartners] = await Promise.all([
    db.execute<OverviewCounters>(sql`
      select
        (select count(*) from partners where account_status = 'active')::int as active,
        (select count(*) from partners where account_status = 'activating')::int as activating,
        (select count(*) from partners where account_status = 'suspended')::int as suspended,
        (select count(*) from partners where account_status = 'cancelled')::int as cancelled,
        (select count(*) from partners where verification_status = 'pending' and account_status <> 'cancelled')::int as to_verify,
        (select count(*) from partners where created_at > ${at(-30 * DAY)})::int as new_partners,
        (select count(*) from partners where created_at between ${at(-60 * DAY)} and ${at(-30 * DAY)})::int as new_partners_prev,
        (select count(*) from partners p where p.account_status = 'activating' and p.created_at < ${at(-3 * DAY)}
           and not exists (select 1 from subscriptions s where s.partner_id = p.id and s.status = 'active'))::int as stuck_activating,
        (select count(*) from subscriptions where status = 'active' and free)::int as free_subs,
        (select coalesce(json_agg(json_build_object('plan', p.name, 'period', s.period, 'monthlyPriceCents', p.monthly_price_cents, 'yearlyPriceCents', p.yearly_price_cents)), '[]')
           from subscriptions s join plans p on p.id = s.plan_id where s.status = 'active' and not s.free) as paid_subs,
        (select count(*) from leads where created_at > ${at(-30 * DAY)})::int as leads_created,
        (select count(*) from leads where verified_at > ${at(-30 * DAY)})::int as leads_verified,
        (select count(*) from leads where verified_at between ${at(-60 * DAY)} and ${at(-30 * DAY)})::int as leads_verified_prev,
        -- Richieste confermate giorno per giorno (ora italiana), ultimi 30 giorni compreso oggi.
        (select json_agg(json_build_object('day', d.day, 'n', coalesce(x.n, 0)) order by d.day)
           from (select generate_series((${t}::timestamptz at time zone 'Europe/Rome')::date - 29,
                                        (${t}::timestamptz at time zone 'Europe/Rome')::date, interval '1 day')::date as day) d
           left join (select (verified_at at time zone 'Europe/Rome')::date as day, count(*)::int as n from leads
                      where verified_at > ${at(-31 * DAY)} group by 1) x on x.day = d.day) as leads_daily,
        (select count(*) from leads where delivered_at > ${at(-30 * DAY)} and charge = 'quota')::int as leads_delivered,
        (select count(*) from leads where verified_at is null and created_at between ${at(-7 * DAY)} and ${at(-30 * 60_000)})::int as leads_unconfirmed,
        (select count(*) from leads where verified_at > ${at(-30 * DAY)} and charge = 'locked')::int as leads_locked,
        (select count(*) from leads where verified_at > ${at(-7 * DAY)} and delivered_at is null and charge = 'pending')::int as leads_not_delivered,
        (select count(*) from leads where report_status = 'open')::int as open_reports,
        (select count(*) from support_tickets where status = 'open')::int as open_tickets,
        (select count(*) from boosts where placement = 'home' and starts_at <= ${t} and ends_at > ${t})::int as home_active,
        (select count(*) from boosts where placement = 'search' and starts_at <= ${t} and ends_at > ${t})::int as search_active,
        (select count(*) from area_extensions where starts_at <= ${t} and ends_at > ${t})::int as extensions_active,
        ((select count(*) from boosts where ends_at > ${t} and ends_at <= ${at(3 * DAY)})
          + (select count(*) from area_extensions where ends_at > ${t} and ends_at <= ${at(3 * DAY)}))::int as sponsorships_ending,
        -- Gratuiti finiti dopo le 3 richieste (syncFreePlan): aspettano che l'azienda scelga un piano.
        (select count(*) from subscriptions s where s.status = 'suspended' and s.free)::int as free_at_limit,
        (select coalesce(json_agg(x order by x.n desc), '[]') from (
           select case when s.free then 'Gratuito' else p.name end as name, count(*)::int as n
           from subscriptions s join plans p on p.id = s.plan_id join partners pa on pa.id = s.partner_id
           where s.status = 'active' and pa.account_status = 'active' group by 1) x) as by_plan,
        (select coalesce(json_agg(x order by x.n desc), '[]') from (
           select pr.name, count(*)::int as n from partners pa
           join municipalities m on m.id = pa.municipality_id join provinces pr on pr.id = m.province_id
           where pa.account_status = 'active' group by pr.name) x) as by_province,
        (select coalesce(json_agg(x order by x.n desc), '[]') from (
           select c.name, count(*)::int as n from partners pa join categories c on c.id = pa.category_id
           where pa.account_status = 'active' group by c.name order by n desc limit 8) x) as by_category
    `),
    listTickets({ status: "open", limit: 6 }),
    db
      .select({
        id: partners.id,
        displayName: partners.displayName,
        accountStatus: partners.accountStatus,
        createdAt: partners.createdAt,
        category: categories.name,
        municipality: municipalities.name,
      })
      .from(partners)
      .innerJoin(categories, eq(categories.id, partners.categoryId))
      .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
      .orderBy(desc(partners.createdAt))
      .limit(5),
  ]);
  const c = counters[0];
  return {
    partnersBy: {
      active: c.active,
      activating: c.activating,
      suspended: c.suspended,
      cancelled: c.cancelled,
    } satisfies Record<AccountStatus, number>,
    toVerify: c.to_verify,
    newPartners: c.new_partners,
    newPartnersPrev: c.new_partners_prev,
    stuckActivating: c.stuck_activating,
    mrrCents: monthlyRecurringCents(c.paid_subs),
    mrrByPlan: ["Premium", "Normal", "Base"].map((plan) => ({ plan, cents: monthlyRecurringCents(c.paid_subs.filter((s) => s.plan === plan)) })),
    activeSubscriptions: c.paid_subs.length,
    freeSubscriptions: c.free_subs,
    freeAtLimit: c.free_at_limit,
    leadsCreated: c.leads_created,
    leadsVerified: c.leads_verified,
    leadsVerifiedPrev: c.leads_verified_prev,
    leadsDaily: c.leads_daily,
    leadsDelivered: c.leads_delivered,
    leadsUnconfirmed: c.leads_unconfirmed,
    leadsLocked: c.leads_locked,
    leadsNotDelivered: c.leads_not_delivered,
    homeSponsors: c.home_active,
    searchBoosts: c.search_active,
    areaExtensions: c.extensions_active,
    sponsorshipsEnding: c.sponsorships_ending,
    openReports: c.open_reports,
    ticketsToAnswer: c.open_tickets,
    byPlan: c.by_plan,
    byProvince: c.by_province,
    byCategory: c.by_category,
    openTickets,
    recentPartners,
  };
}

export type PartnerFilter = AccountStatus | "da-verificare";

export async function listPartnersAdmin({ q, filter }: { q?: string; filter?: PartnerFilter }) {
  const filters: SQL[] = [];
  const query = q?.trim();
  if (query) {
    filters.push(
      or(
        ilike(partners.displayName, like(query)),
        ilike(partners.businessName, like(query)),
        ilike(partners.vatNumber, like(query)),
        ilike(partners.email, like(query)),
      )!,
    );
  }
  if (filter === "da-verificare") filters.push(eq(partners.verificationStatus, "pending"), ne(partners.accountStatus, "cancelled"));
  else if (filter) filters.push(eq(partners.accountStatus, filter));
  const rows = await db
    .select({
      id: partners.id,
      displayName: partners.displayName,
      businessName: partners.businessName,
      vatNumber: partners.vatNumber,
      accountStatus: partners.accountStatus,
      verificationStatus: partners.verificationStatus,
      createdAt: partners.createdAt,
      category: categories.name,
      municipality: municipalities.name,
      plan: planLabel,
    })
    .from(partners)
    .innerJoin(categories, eq(categories.id, partners.categoryId))
    .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
    .leftJoin(subscriptions, and(eq(subscriptions.partnerId, partners.id), inArray(subscriptions.status, ["active", "suspended", "activating"])))
    .leftJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(...filters))
    .orderBy(desc(partners.createdAt))
    .limit(300);
  // Un partner con più abbonamenti aperti comparirebbe due volte: si tiene la prima riga.
  const seen = new Set<string>();
  return rows.filter((r) => !seen.has(r.id) && seen.add(r.id));
}

export async function countPartnersByFilter(): Promise<Record<PartnerFilter | "all", number>> {
  const [byStatus, [toVerify]] = await Promise.all([
    db.select({ status: partners.accountStatus, n: count() }).from(partners).groupBy(partners.accountStatus),
    db
      .select({ n: count() })
      .from(partners)
      .where(and(eq(partners.verificationStatus, "pending"), ne(partners.accountStatus, "cancelled"))),
  ]);
  const counts = {
    active: 0,
    activating: 0,
    suspended: 0,
    cancelled: 0,
    "da-verificare": toVerify?.n ?? 0,
    all: 0,
  };
  for (const r of byStatus) {
    counts[r.status] = r.n;
    counts.all += r.n;
  }
  return counts;
}

export async function getPartnerAdmin(id: string, now: Date) {
  // Tutte le letture partono insieme: sul database remoto conta il numero di viaggi in fila, non di query.
  const [[p], [sub], [leadTotals], members, tickets, history, recentLeads, sponsorships] = await Promise.all([
    db
      .select({
        id: partners.id,
        type: partners.type,
        displayName: partners.displayName,
        businessName: partners.businessName,
        slug: partners.slug,
        vatNumber: partners.vatNumber,
        taxCode: partners.taxCode,
        sdiCode: partners.sdiCode,
        pec: partners.pec,
        address: partners.address,
        phone: partners.phone,
        email: partners.email,
        tagline: partners.tagline,
        accountStatus: partners.accountStatus,
        verificationStatus: partners.verificationStatus,
        completeness: partners.completeness,
        stripeCustomerId: partners.stripeCustomerId,
        createdAt: partners.createdAt,
        category: categories.name,
        categorySlug: categories.slug,
        municipality: municipalities.name,
        provinceSlug: provinces.slug,
        provinceCode: provinces.code,
      })
      .from(partners)
      .innerJoin(categories, eq(categories.id, partners.categoryId))
      .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
      .innerJoin(provinces, eq(provinces.id, municipalities.provinceId))
      .where(eq(partners.id, id))
      .limit(1),
    db
      .select({
        status: subscriptions.status,
        period: subscriptions.period,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        planName: planLabel,
        free: subscriptions.free,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.partnerId, id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1),
    db
      .select({
        total: count(),
        last30: count(sql`case when ${leads.createdAt} > now() - interval '30 days' then 1 end`),
        reported: count(leads.reportStatus),
      })
      .from(leads)
      .where(and(eq(leads.partnerId, id), isNotNull(leads.verifiedAt))),
    db
      .select({
        name: users.name,
        email: users.email,
        role: partnerMembers.role,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(partnerMembers)
      .innerJoin(users, eq(users.id, partnerMembers.userId))
      .where(eq(partnerMembers.partnerId, id)),
    db
      .select({
        number: supportTickets.number,
        subject: supportTickets.subject,
        status: supportTickets.status,
        lastMessageAt: supportTickets.lastMessageAt,
      })
      .from(supportTickets)
      .where(eq(supportTickets.partnerId, id))
      .orderBy(desc(supportTickets.lastMessageAt))
      .limit(10),
    db
      .select({
        id: auditLogs.id,
        actor: auditLogs.actor,
        action: auditLogs.action,
        data: auditLogs.data,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.entity, "partner"), eq(auditLogs.entityId, id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(15),
    listLeadsAdmin({ partnerId: id, limit: 8 }),
    listSponsorshipsAdmin(now, { partnerId: id, limit: 10 }),
  ]);
  if (!p) return null;
  return {
    ...p,
    publicPath: profileHref({
      partnerType: p.type,
      provinceSlug: p.provinceSlug,
      categorySlug: p.categorySlug,
      slug: p.slug,
    }),
    sub: sub ?? null,
    leads: leadTotals ?? { total: 0, last30: 0, reported: 0 },
    members,
    tickets,
    history,
    recentLeads,
    sponsorships,
  };
}

export async function listLeadReports() {
  return db
    .select({
      id: leads.id,
      partnerId: partners.id,
      partnerName: partners.displayName,
      clientName: leads.clientName,
      requestType: leads.requestType,
      municipality: municipalities.name,
      reportReason: leads.reportReason,
      reportStatus: leads.reportStatus,
      reportedAt: leads.reportedAt,
      charge: leads.charge,
      tokensCharged: leads.tokensCharged,
    })
    .from(leads)
    .innerJoin(partners, eq(partners.id, leads.partnerId))
    .innerJoin(municipalities, eq(municipalities.id, leads.municipalityId))
    .where(isNotNull(leads.reportStatus))
    .orderBy(sql`${leads.reportStatus} = 'open' desc`, desc(leads.reportedAt))
    .limit(200);
}

/** Registro delle attività, senza le righe del freno anti-flood per IP (servono solo a contare). */
export async function listAudit(q?: string) {
  const filters: SQL[] = [not(eq(auditLogs.entity, "ip"))];
  const query = q?.trim();
  if (query) filters.push(or(ilike(auditLogs.actor, like(query)), ilike(auditLogs.action, like(query)), ilike(auditLogs.entityId, like(query)))!);
  return db
    .select({
      id: auditLogs.id,
      actor: auditLogs.actor,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      data: auditLogs.data,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(and(...filters))
    .orderBy(desc(auditLogs.createdAt))
    .limit(300);
}

// ---------------------------------------------------------------------------
// Richieste di contatto (tutte, non solo quelle segnalate)
// ---------------------------------------------------------------------------

export const LEAD_FILTERS = [
  { value: "consegnate", label: "Consegnate" },
  { value: "senza-contatti", label: "Senza contatti" },
  { value: "non-consegnate", label: "Non consegnate" },
  { value: "da-confermare", label: "Codice non confermato" },
  { value: "segnalate", label: "Segnalate" },
  { value: "non-richiamati", label: "Cliente non richiamato" },
] as const;
export type LeadFilter = (typeof LEAD_FILTERS)[number]["value"];

const leadFilterSql = (f: LeadFilter): SQL =>
  ({
    consegnate: and(eq(leads.charge, "quota"), isNotNull(leads.deliveredAt))!,
    "senza-contatti": eq(leads.charge, "locked"),
    "non-consegnate": and(isNotNull(leads.verifiedAt), isNull(leads.deliveredAt), eq(leads.charge, "pending"))!,
    "da-confermare": isNull(leads.verifiedAt),
    segnalate: isNotNull(leads.reportStatus),
    "non-richiamati": eq(leads.clientContacted, false),
  })[f];

export async function listLeadsAdmin({ q, filter, partnerId, limit = 200 }: { q?: string; filter?: LeadFilter; partnerId?: string; limit?: number }) {
  const filters: SQL[] = [];
  if (filter) filters.push(leadFilterSql(filter));
  if (partnerId) filters.push(eq(leads.partnerId, partnerId));
  const query = q?.trim();
  if (query) {
    filters.push(
      or(
        ilike(leads.clientName, like(query)),
        ilike(leads.clientEmail, like(query)),
        ilike(leads.clientPhone, like(query)),
        ilike(partners.displayName, like(query)),
      )!,
    );
  }
  return db
    .select({
      id: leads.id,
      createdAt: leads.createdAt,
      clientName: leads.clientName,
      clientEmail: leads.clientEmail,
      clientPhone: leads.clientPhone,
      requestType: leads.requestType,
      category: categories.name,
      municipality: municipalities.name,
      partnerId: partners.id,
      partnerName: partners.displayName,
      status: leads.status,
      charge: leads.charge,
      verifiedAt: leads.verifiedAt,
      deliveredAt: leads.deliveredAt,
      reportStatus: leads.reportStatus,
      clientContacted: leads.clientContacted,
    })
    .from(leads)
    .innerJoin(partners, eq(partners.id, leads.partnerId))
    .innerJoin(categories, eq(categories.id, leads.categoryId))
    .innerJoin(municipalities, eq(municipalities.id, leads.municipalityId))
    .where(and(...filters))
    .orderBy(desc(leads.createdAt))
    .limit(limit);
}

export async function countLeadsByFilter(): Promise<Record<LeadFilter | "all", number>> {
  const [r] = await db
    .select({
      all: count(),
      ...Object.fromEntries(LEAD_FILTERS.map((f) => [f.value, sql<number>`count(*) filter (where ${leadFilterSql(f.value)})`.mapWith(Number)])),
    })
    .from(leads);
  return r as Record<LeadFilter | "all", number>;
}

// ---------------------------------------------------------------------------
// Abbonamenti
// ---------------------------------------------------------------------------

export const SUBSCRIPTION_FILTERS = [
  { value: "attivi", label: "A pagamento" },
  { value: "gratuiti", label: "Gratuiti" },
  { value: "sospesi", label: "Pagamento non riuscito" },
  { value: "da-pagare", label: "Da pagare" },
  { value: "disdetti", label: "Disdetti" },
] as const;
export type SubscriptionFilter = (typeof SUBSCRIPTION_FILTERS)[number]["value"];

const subscriptionFilterSql = (f: SubscriptionFilter): SQL =>
  ({
    attivi: and(eq(subscriptions.status, "active"), eq(subscriptions.free, false))!,
    // Anche i gratuiti finiti dopo le 3 richieste (syncFreePlan), che non sono pagamenti non riusciti.
    gratuiti: and(inArray(subscriptions.status, ["active", "suspended"]), eq(subscriptions.free, true))!,
    sospesi: and(eq(subscriptions.status, "suspended"), eq(subscriptions.free, false))!,
    "da-pagare": eq(subscriptions.status, "activating"),
    disdetti: eq(subscriptions.status, "cancelled"),
  })[f];

export async function listSubscriptionsAdmin(filter?: SubscriptionFilter) {
  return db
    .select({
      id: subscriptions.id,
      partnerId: partners.id,
      partnerName: partners.displayName,
      planName: planLabel,
      period: subscriptions.period,
      status: subscriptions.status,
      free: subscriptions.free,
      monthlyPriceCents: plans.monthlyPriceCents,
      yearlyPriceCents: plans.yearlyPriceCents,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(partners, eq(partners.id, subscriptions.partnerId))
    .where(filter ? subscriptionFilterSql(filter) : undefined)
    .orderBy(sql`${subscriptions.status} = 'suspended' desc`, subscriptions.currentPeriodEnd)
    .limit(300);
}

export async function countSubscriptionsByFilter(): Promise<Record<SubscriptionFilter | "all", number>> {
  const [r] = await db
    .select({
      all: count(),
      ...Object.fromEntries(SUBSCRIPTION_FILTERS.map((f) => [f.value, sql<number>`count(*) filter (where ${subscriptionFilterSql(f.value)})`.mapWith(Number)])),
    })
    .from(subscriptions);
  return r as Record<SubscriptionFilter | "all", number>;
}

// ---------------------------------------------------------------------------
// Sponsorizzazioni: logo in Home, boost nella ricerca, estensioni per provincia (prima per comune)
// ---------------------------------------------------------------------------

export type SponsorshipKind = "home" | "search" | "area";

/** In corso e programmate, oppure finite negli ultimi 90 giorni; con partnerId tutte quelle di un'azienda. */
export async function listSponsorshipsAdmin(
  now: Date,
  { ended = false, partnerId, limit = 300 }: { ended?: boolean; partnerId?: string; limit?: number } = {},
) {
  const t = now.toISOString();
  const window = partnerId
    ? sql`p.id = ${partnerId}`
    : ended
      ? sql`ends_at <= ${t} and ends_at > ${new Date(now.getTime() - 90 * DAY).toISOString()}`
      : sql`ends_at > ${t}`;
  const rows = await db.execute<{
    id: string;
    kind: SponsorshipKind;
    partner_id: string;
    partner_name: string;
    zone: string;
    starts_at: string;
    ends_at: string;
  }>(sql`
    select b.id, b.placement::text as kind, p.id as partner_id, p.display_name as partner_name,
           c.name || ' · ' || pr.name as zone, b.starts_at, b.ends_at
    from boosts b join partners p on p.id = b.partner_id join categories c on c.id = b.category_id join provinces pr on pr.id = b.province_id
    where ${window}
    union all
    select e.id, 'area', p.id, p.display_name, coalesce(m.name, 'Provincia di ' || pr.name), e.starts_at, e.ends_at
    from area_extensions e join partners p on p.id = e.partner_id
      left join municipalities m on m.id = e.municipality_id left join provinces pr on pr.id = e.province_id
    where ${window}
    order by ends_at ${ended || partnerId ? sql`desc` : sql`asc`}
    limit ${limit}
  `);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    partnerId: r.partner_id,
    partnerName: r.partner_name,
    zone: r.zone,
    startsAt: new Date(r.starts_at),
    endsAt: new Date(r.ends_at),
  }));
}

/**
 * "Inoltra una richiesta" dalle province non ancora attive: quante per provincia (totale e ultimi 30 giorni),
 * le categorie più chieste e le ultime arrivate. Serve a decidere dove aprire dopo Treviso.
 */
export async function getAreaRequestsAdmin(now: Date) {
  const since = new Date(now.getTime() - 30 * DAY);
  const [byProvince, byCategory, latest] = await Promise.all([
    db
      .select({
        code: provinces.code,
        name: provinces.name,
        total: count(areaRequests.id),
        recent: sql<number>`count(${areaRequests.id}) filter (where ${areaRequests.createdAt} > ${since})::int`,
      })
      .from(provinces)
      .leftJoin(areaRequests, eq(areaRequests.provinceId, provinces.id))
      .groupBy(provinces.id)
      .orderBy(desc(count(areaRequests.id)), provinces.name),
    db
      .select({ code: provinces.code, category: categories.name, n: count() })
      .from(areaRequests)
      .innerJoin(provinces, eq(provinces.id, areaRequests.provinceId))
      .innerJoin(categories, eq(categories.id, areaRequests.categoryId))
      .groupBy(provinces.code, categories.name)
      .orderBy(desc(count()), categories.name),
    db
      .select({
        id: areaRequests.id,
        province: provinces.name,
        municipality: municipalities.name,
        category: categories.name,
        email: areaRequests.email,
        createdAt: areaRequests.createdAt,
      })
      .from(areaRequests)
      .innerJoin(provinces, eq(provinces.id, areaRequests.provinceId))
      .innerJoin(categories, eq(categories.id, areaRequests.categoryId))
      .leftJoin(municipalities, eq(municipalities.id, areaRequests.municipalityId))
      .orderBy(desc(areaRequests.createdAt))
      .limit(100),
  ]);
  const provincesWithTop = byProvince.map((p) => ({
    ...p,
    topCategories: byCategory.filter((c) => c.code === p.code).slice(0, 3),
  }));
  return { provinces: provincesWithTop, latest };
}
