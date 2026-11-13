import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLogs, commentReports, partners, portfolioComments, portfolioItems, userStrikes, users } from "@/lib/db/schema";
import type { CommentStatus, ReportReason } from "@/lib/domain/comments";
import { sanctionFor, type Sanction } from "@/lib/domain/moderation";

const UUID = /^[0-9a-f-]{36}$/i;

/** Date delle violazioni non annullate di un account. */
async function activeStrikeDates(userId: string): Promise<Date[]> {
  const rows = await db
    .select({ at: userStrikes.createdAt })
    .from(userStrikes)
    .where(and(eq(userStrikes.userId, userId), isNull(userStrikes.revokedAt)));
  return rows.map((r) => r.at);
}

/** Sanzione in vigore adesso per l'account. */
export async function getSanction(userId: string, now = new Date()): Promise<Sanction> {
  return sanctionFor(await activeStrikeDates(userId), now);
}

export async function countOpenCommentReports(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(distinct ${commentReports.commentId})::int` })
    .from(commentReports)
    .where(eq(commentReports.status, "open"));
  return row?.n ?? 0;
}

export type ReportedComment = {
  id: string;
  body: string;
  status: CommentStatus;
  createdAt: Date;
  author: { id: string; name: string; email: string; activeStrikes: number };
  work: { id: string; title: string; partnerId: string; partnerName: string };
  reports: { reason: ReportReason; note: string | null; status: "open" | "accepted" | "rejected"; createdAt: Date }[];
  open: number;
};

/** Commenti segnalati, prima quelli con segnalazioni ancora da decidere. */
export async function listReportedComments(): Promise<ReportedComment[]> {
  const reports = await db
    .select({ commentId: commentReports.commentId, reason: commentReports.reason, note: commentReports.note, status: commentReports.status, createdAt: commentReports.createdAt })
    .from(commentReports)
    .orderBy(desc(commentReports.createdAt))
    .limit(1000);
  const ids = [...new Set(reports.map((r) => r.commentId))];
  if (ids.length === 0) return [];
  const comments = await db
    .select({
      id: portfolioComments.id,
      body: portfolioComments.body,
      status: portfolioComments.status,
      createdAt: portfolioComments.createdAt,
      authorId: users.id,
      authorName: users.name,
      authorEmail: users.email,
      activeStrikes: sql<number>`(select count(*)::int from ${userStrikes} where ${userStrikes.userId} = ${users.id} and ${userStrikes.revokedAt} is null)`,
      itemId: portfolioItems.id,
      itemTitle: portfolioItems.title,
      partnerId: partners.id,
      partnerName: partners.displayName,
    })
    .from(portfolioComments)
    .innerJoin(users, eq(users.id, portfolioComments.userId))
    .innerJoin(portfolioItems, eq(portfolioItems.id, portfolioComments.portfolioItemId))
    .innerJoin(partners, eq(partners.id, portfolioItems.partnerId))
    .where(inArray(portfolioComments.id, ids));
  return comments
    .map((c) => {
      const own = reports.filter((r) => r.commentId === c.id).map((r) => ({ reason: r.reason, note: r.note, status: r.status, createdAt: r.createdAt }));
      return {
        id: c.id,
        body: c.body,
        status: c.status,
        createdAt: c.createdAt,
        author: { id: c.authorId, name: c.authorName, email: c.authorEmail, activeStrikes: c.activeStrikes },
        work: { id: c.itemId, title: c.itemTitle, partnerId: c.partnerId, partnerName: c.partnerName },
        reports: own,
        open: own.filter((r) => r.status === "open").length,
      };
    })
    .sort((a, b) => Number(b.open > 0) - Number(a.open > 0) || b.reports[0].createdAt.getTime() - a.reports[0].createdAt.getTime());
}

/**
 * Toglie un commento perché contrario alle regole: non si vede più (resta all'autore, con la dicitura), le
 * segnalazioni aperte sono accolte e l'autore prende una violazione. Tutto insieme o niente.
 * Restituisce la violazione creata (per avvisare l'autore), oppure null se il commento non c'è o era già stato tolto.
 */
export async function removeComment(commentId: string, admin: { email: string }, reason: ReportReason, note: string | null, now = new Date()) {
  if (!UUID.test(commentId)) return null;
  return db.transaction(async (tx) => {
    const [c] = await tx
      .select({ id: portfolioComments.id, body: portfolioComments.body, status: portfolioComments.status, userId: users.id, name: users.name, email: users.email, workTitle: portfolioItems.title, itemId: portfolioItems.id })
      .from(portfolioComments)
      .innerJoin(users, eq(users.id, portfolioComments.userId))
      .innerJoin(portfolioItems, eq(portfolioItems.id, portfolioComments.portfolioItemId))
      .where(eq(portfolioComments.id, commentId))
      .for("update", { of: portfolioComments });
    if (!c || c.status === "removed") return null;
    await tx.update(portfolioComments).set({ status: "removed" }).where(eq(portfolioComments.id, c.id));
    await tx.update(commentReports).set({ status: "accepted" }).where(and(eq(commentReports.commentId, c.id), eq(commentReports.status, "open")));
    const [strike] = await tx
      .insert(userStrikes)
      .values({ userId: c.userId, commentId: c.id, reason, commentBody: c.body, note, decidedBy: admin.email, createdAt: now })
      .returning({ id: userStrikes.id });
    const strikes = await tx.select({ at: userStrikes.createdAt }).from(userStrikes).where(and(eq(userStrikes.userId, c.userId), isNull(userStrikes.revokedAt)));
    const sanction = sanctionFor(strikes.map((s) => s.at), now);
    await tx.insert(auditLogs).values({ actor: admin.email, action: "comment.remove", entity: "comment", entityId: c.id, data: { reason, note, user: c.email, strikes: sanction.strikes, sanction: sanction.level } });
    return { strikeId: strike.id, itemId: c.itemId };
  });
}

/** Le segnalazioni non reggono: restano chiuse come respinte, il commento non cambia. */
export async function rejectCommentReports(commentId: string, admin: { email: string }): Promise<string | null> {
  if (!UUID.test(commentId)) return null;
  const closed = await db
    .update(commentReports)
    .set({ status: "rejected" })
    .where(and(eq(commentReports.commentId, commentId), eq(commentReports.status, "open")))
    .returning({ id: commentReports.id });
  if (closed.length === 0) return null;
  await db.insert(auditLogs).values({ actor: admin.email, action: "comment.reports_rejected", entity: "comment", entityId: commentId, data: { reports: closed.length } });
  const [c] = await db.select({ itemId: portfolioComments.portfolioItemId }).from(portfolioComments).where(eq(portfolioComments.id, commentId));
  return c?.itemId ?? null;
}

/** Quello che serve per scrivere all'autore di una violazione: chi è, cosa è stato tolto, sotto quale lavoro, cosa comporta. */
export async function getStrikeNotice(strikeId: string, now = new Date()) {
  if (!UUID.test(strikeId)) return null;
  const [s] = await db
    .select({
      id: userStrikes.id,
      reason: userStrikes.reason,
      body: userStrikes.commentBody,
      revokedAt: userStrikes.revokedAt,
      userId: users.id,
      name: users.name,
      email: users.email,
      workTitle: portfolioItems.title,
    })
    .from(userStrikes)
    .innerJoin(users, eq(users.id, userStrikes.userId))
    .leftJoin(portfolioComments, eq(portfolioComments.id, userStrikes.commentId))
    .leftJoin(portfolioItems, eq(portfolioItems.id, portfolioComments.portfolioItemId))
    .where(eq(userStrikes.id, strikeId));
  if (!s || s.revokedAt) return null;
  return { ...s, sanction: await getSanction(s.userId, now) };
}

export async function markStrikeNotified(strikeId: string, now = new Date()) {
  await db.update(userStrikes).set({ notifiedAt: now }).where(eq(userStrikes.id, strikeId));
}

/** Ultime violazioni, per il gestionale. */
export async function listStrikes() {
  return db
    .select({
      id: userStrikes.id,
      reason: userStrikes.reason,
      commentBody: userStrikes.commentBody,
      note: userStrikes.note,
      decidedBy: userStrikes.decidedBy,
      createdAt: userStrikes.createdAt,
      notifiedAt: userStrikes.notifiedAt,
      revokedAt: userStrikes.revokedAt,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
    })
    .from(userStrikes)
    .innerJoin(users, eq(users.id, userStrikes.userId))
    .orderBy(desc(userStrikes.createdAt))
    .limit(100);
}

/**
 * Contestazione accolta: la violazione non conta più e il commento, se c'è ancora, torna visibile.
 * Restituisce i dati per avvisare la persona, oppure null se la violazione non c'è o era già annullata.
 */
export async function revokeStrike(strikeId: string, admin: { email: string }, now = new Date()) {
  if (!UUID.test(strikeId)) return null;
  return db.transaction(async (tx) => {
    const [s] = await tx
      .update(userStrikes)
      .set({ revokedAt: now })
      .where(and(eq(userStrikes.id, strikeId), isNull(userStrikes.revokedAt)))
      .returning({ userId: userStrikes.userId, commentId: userStrikes.commentId });
    if (!s) return null;
    let itemId: string | null = null;
    if (s.commentId) {
      const [c] = await tx
        .update(portfolioComments)
        .set({ status: "visible" })
        .where(and(eq(portfolioComments.id, s.commentId), eq(portfolioComments.status, "removed")))
        .returning({ itemId: portfolioComments.portfolioItemId });
      itemId = c?.itemId ?? null;
    }
    const [u] = await tx.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, s.userId));
    await tx.insert(auditLogs).values({ actor: admin.email, action: "comment.strike_revoked", entity: "user", entityId: s.userId, data: { strike: strikeId, restored: !!itemId } });
    return { itemId, name: u.name, email: u.email, restored: !!itemId };
  });
}

/** Sanzione in vigore adesso per ogni account dell'elenco che ha almeno una violazione non annullata. */
export async function sanctionsOf(userIds: string[], now = new Date()): Promise<Map<string, Sanction>> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ userId: userStrikes.userId, at: userStrikes.createdAt })
    .from(userStrikes)
    .where(and(inArray(userStrikes.userId, ids), isNull(userStrikes.revokedAt)));
  const dates = new Map<string, Date[]>();
  for (const r of rows) dates.set(r.userId, [...(dates.get(r.userId) ?? []), r.at]);
  return new Map([...dates].map(([userId, list]) => [userId, sanctionFor(list, now)]));
}
