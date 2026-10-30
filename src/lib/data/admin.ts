import "server-only";
import { and, count, desc, eq, gt, ilike, inArray, isNotNull, ne, not, or, sql, sum, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  auditLogs,
  categories,
  leads,
  municipalities,
  partnerMembers,
  partners,
  plans,
  provinces,
  reviews,
  subscriptions,
  supportTickets,
  tokenLedger,
  users,
} from "@/lib/db/schema";
import { profileHref } from "@/lib/data/search";
import { countTicketsByStatus, listTickets } from "@/lib/data/support";
import { monthlyRecurringCents } from "@/lib/domain/admin";
import { tokenBalance } from "@/lib/domain/tokens";

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

export async function getAdminOverview(now: Date) {
  const since = new Date(now.getTime() - 30 * DAY);
  const [byStatus, [toVerify], [newPartners], activeSubs, [leadStats], tokenRows, [reports], [flagged], ticketCounts, openTickets, recentPartners] = await Promise.all([
    db.select({ status: partners.accountStatus, n: count() }).from(partners).groupBy(partners.accountStatus),
    db
      .select({ n: count() })
      .from(partners)
      .where(and(eq(partners.verificationStatus, "pending"), ne(partners.accountStatus, "cancelled"))),
    db.select({ n: count() }).from(partners).where(gt(partners.createdAt, since)),
    db
      .select({ period: subscriptions.period, monthlyPriceCents: plans.monthlyPriceCents, yearlyPriceCents: plans.yearlyPriceCents })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.status, "active")),
    db.select({ verified: count(leads.verifiedAt), delivered: count(leads.deliveredAt) }).from(leads).where(gt(leads.createdAt, since)),
    db
      .select({ kind: tokenLedger.kind, total: sum(tokenLedger.amount) })
      .from(tokenLedger)
      .where(and(gt(tokenLedger.createdAt, since), inArray(tokenLedger.kind, ["purchase", "consume"])))
      .groupBy(tokenLedger.kind),
    db.select({ n: count() }).from(leads).where(eq(leads.reportStatus, "open")),
    db.select({ n: count() }).from(reviews).where(eq(reviews.status, "flagged")),
    countTicketsByStatus(),
    listTickets({ status: "open", limit: 6 }),
    db
      .select({ id: partners.id, displayName: partners.displayName, accountStatus: partners.accountStatus, createdAt: partners.createdAt, category: categories.name, municipality: municipalities.name })
      .from(partners)
      .innerJoin(categories, eq(categories.id, partners.categoryId))
      .innerJoin(municipalities, eq(municipalities.id, partners.municipalityId))
      .orderBy(desc(partners.createdAt))
      .limit(5),
  ]);
  const partnersBy = Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Partial<Record<AccountStatus, number>>;
  const tokens = Object.fromEntries(tokenRows.map((r) => [r.kind, Math.abs(Number(r.total ?? 0))]));
  return {
    partnersBy,
    toVerify: toVerify?.n ?? 0,
    newPartners: newPartners?.n ?? 0,
    mrrCents: monthlyRecurringCents(activeSubs),
    activeSubscriptions: activeSubs.length,
    leadsVerified: leadStats?.verified ?? 0,
    leadsDelivered: leadStats?.delivered ?? 0,
    tokensSold: tokens.purchase ?? 0,
    tokensUsed: tokens.consume ?? 0,
    openReports: reports?.n ?? 0,
    flaggedReviews: flagged?.n ?? 0,
    ticketsToAnswer: ticketCounts.open,
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
      or(ilike(partners.displayName, like(query)), ilike(partners.businessName, like(query)), ilike(partners.vatNumber, like(query)), ilike(partners.email, like(query)))!,
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
      plan: plans.name,
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
  const counts = { active: 0, activating: 0, suspended: 0, cancelled: 0, "da-verificare": toVerify?.n ?? 0, all: 0 };
  for (const r of byStatus) {
    counts[r.status] = r.n;
    counts.all += r.n;
  }
  return counts;
}

export async function getPartnerAdmin(id: string, now: Date) {
  const [p] = await db
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
    .limit(1);
  if (!p) return null;

  const [[sub], ledger, [leadTotals], members, tickets, history] = await Promise.all([
    db
      .select({
        status: subscriptions.status,
        period: subscriptions.period,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        leadsUsed: subscriptions.leadsUsed,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        planName: plans.name,
        leadsIncluded: plans.leadsIncluded,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.partnerId, id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1),
    db.select().from(tokenLedger).where(eq(tokenLedger.partnerId, id)).orderBy(desc(tokenLedger.createdAt)),
    db
      .select({
        total: count(),
        last30: count(sql`case when ${leads.createdAt} > now() - interval '30 days' then 1 end`),
        reported: count(leads.reportStatus),
      })
      .from(leads)
      .where(and(eq(leads.partnerId, id), isNotNull(leads.verifiedAt))),
    db
      .select({ name: users.name, email: users.email, role: partnerMembers.role, emailVerifiedAt: users.emailVerifiedAt })
      .from(partnerMembers)
      .innerJoin(users, eq(users.id, partnerMembers.userId))
      .where(eq(partnerMembers.partnerId, id)),
    db
      .select({ number: supportTickets.number, subject: supportTickets.subject, status: supportTickets.status, lastMessageAt: supportTickets.lastMessageAt })
      .from(supportTickets)
      .where(eq(supportTickets.partnerId, id))
      .orderBy(desc(supportTickets.lastMessageAt))
      .limit(10),
    db
      .select({ id: auditLogs.id, actor: auditLogs.actor, action: auditLogs.action, data: auditLogs.data, createdAt: auditLogs.createdAt })
      .from(auditLogs)
      .where(and(eq(auditLogs.entity, "partner"), eq(auditLogs.entityId, id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(15),
  ]);
  const balance = tokenBalance(
    ledger.map((r) => ({ id: r.id, kind: r.kind, amount: r.amount, lotId: r.lotId, expiresAt: r.expiresAt, createdAt: r.createdAt })),
    now,
  );
  return {
    ...p,
    publicPath: profileHref({ partnerType: p.type, provinceSlug: p.provinceSlug, categorySlug: p.categorySlug, slug: p.slug }),
    sub: sub ?? null,
    balance,
    ledger: ledger.slice(0, 8),
    leads: leadTotals ?? { total: 0, last30: 0, reported: 0 },
    members,
    tickets,
    history,
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

export type ReviewStatus = (typeof reviews.status.enumValues)[number];

export async function listReviewsAdmin(status?: ReviewStatus) {
  return db
    .select({
      id: reviews.id,
      partnerId: partners.id,
      partnerName: partners.displayName,
      authorName: reviews.authorName,
      rating: reviews.rating,
      text: reviews.text,
      status: reviews.status,
      partnerReply: reviews.partnerReply,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(partners, eq(partners.id, reviews.partnerId))
    .where(status ? eq(reviews.status, status) : undefined)
    .orderBy(sql`${reviews.status} = 'flagged' desc`, desc(reviews.createdAt))
    .limit(200);
}

export async function countReviewsByStatus(): Promise<Record<ReviewStatus | "all", number>> {
  const rows = await db.select({ status: reviews.status, n: count() }).from(reviews).groupBy(reviews.status);
  const counts = { published: 0, flagged: 0, hidden: 0, all: 0 };
  for (const r of rows) {
    counts[r.status] = r.n;
    counts.all += r.n;
  }
  return counts;
}

/** Registro delle attività, senza le righe del freno anti-flood per IP (servono solo a contare). */
export async function listAudit(q?: string) {
  const filters: SQL[] = [not(eq(auditLogs.entity, "ip"))];
  const query = q?.trim();
  if (query) filters.push(or(ilike(auditLogs.actor, like(query)), ilike(auditLogs.action, like(query)), ilike(auditLogs.entityId, like(query)))!);
  return db
    .select({ id: auditLogs.id, actor: auditLogs.actor, action: auditLogs.action, entity: auditLogs.entity, entityId: auditLogs.entityId, data: auditLogs.data, createdAt: auditLogs.createdAt })
    .from(auditLogs)
    .where(and(...filters))
    .orderBy(desc(auditLogs.createdAt))
    .limit(300);
}
