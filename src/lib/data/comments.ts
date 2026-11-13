import "server-only";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { commentReports, partnerBlocks, partnerFollows, partnerMembers, partners, portfolioComments, portfolioItems, users } from "@/lib/db/schema";
import { publicAuthorName, REPORT_AUTO_HOLD, visibleTo, type CommentStatus, type ReportReason } from "@/lib/domain/comments";

const UUID = /^[0-9a-f-]{36}$/i;
export type BlockMode = "blocked" | "limited";

/** Il lavoro sotto cui si commenta, se è visibile sul sito (azienda attiva, con foto). */
export async function getCommentContext(itemId: string) {
  if (!UUID.test(itemId)) return null;
  const [row] = await db
    .select({ itemId: portfolioItems.id, partnerId: partners.id, hiddenWords: partners.hiddenWords })
    .from(portfolioItems)
    .innerJoin(partners, eq(partners.id, portfolioItems.partnerId))
    .where(and(eq(portfolioItems.id, itemId), eq(partners.accountStatus, "active"), isNotNull(portfolioItems.imageUrl)))
    .limit(1);
  return row ?? null;
}

export type CommentView = {
  id: string;
  body: string;
  status: CommentStatus;
  createdAt: Date;
  authorId: string;
  /** Nome pubblico: nome e iniziale del cognome. */
  authorName: string;
  /** Scritto da chi gestisce l'azienda del lavoro. */
  fromCompany: boolean;
  /** Se l'azienda ha bloccato o limitato l'autore (lo vede solo l'azienda). */
  authorBlock: BlockMode | null;
  mine: boolean;
};

/** Commenti di un lavoro che `viewer` può vedere, dal più vecchio; `total` conta solo quelli pubblici. */
export async function listComments(itemId: string, partnerId: string, viewer: { userId: string | null; moderator: boolean }): Promise<{ comments: CommentView[]; total: number }> {
  const rows = await db
    .select({
      id: portfolioComments.id,
      body: portfolioComments.body,
      status: portfolioComments.status,
      createdAt: portfolioComments.createdAt,
      authorId: users.id,
      name: users.name,
      block: partnerBlocks.mode,
      member: partnerMembers.userId,
    })
    .from(portfolioComments)
    .innerJoin(users, eq(users.id, portfolioComments.userId))
    .leftJoin(partnerBlocks, and(eq(partnerBlocks.partnerId, partnerId), eq(partnerBlocks.userId, users.id)))
    .leftJoin(partnerMembers, and(eq(partnerMembers.partnerId, partnerId), eq(partnerMembers.userId, users.id)))
    .where(eq(portfolioComments.portfolioItemId, itemId))
    .orderBy(asc(portfolioComments.createdAt), asc(portfolioComments.id))
    .limit(300);
  const everyone = { userId: null, moderator: false };
  const shape = (r: (typeof rows)[number]) => ({ status: r.status, authorId: r.authorId, authorBlocked: r.block === "blocked" });
  return {
    total: rows.filter((r) => visibleTo(shape(r), everyone)).length,
    comments: rows
      .filter((r) => visibleTo(shape(r), viewer))
      .map((r) => ({
        id: r.id,
        body: r.body,
        status: r.status,
        createdAt: r.createdAt,
        authorId: r.authorId,
        authorName: publicAuthorName(r.name),
        fromCompany: r.member !== null,
        authorBlock: viewer.moderator ? r.block : null,
        mine: viewer.userId === r.authorId,
      })),
  };
}

/** Conto pubblico dei commenti di un lavoro, come sottoquery (feed di Ispirazione). */
export const publicCommentCount = sql<number>`(
  select count(*)::int from ${portfolioComments}
  where ${portfolioComments.portfolioItemId} = ${portfolioItems.id} and ${portfolioComments.status} = 'visible'
    and not exists (
      select 1 from ${partnerBlocks}
      where ${partnerBlocks.partnerId} = ${portfolioItems.partnerId} and ${partnerBlocks.userId} = ${portfolioComments.userId} and ${partnerBlocks.mode} = 'blocked'
    )
)`;

export async function isEmailVerified(userId: string): Promise<boolean> {
  const [u] = await db.select({ at: users.emailVerifiedAt }).from(users).where(eq(users.id, userId)).limit(1);
  return !!u?.at;
}

/** Quanti commenti ha scritto l'account nell'ultimo minuto e nelle ultime 24 ore (tetto di frequenza). */
export async function recentCommentCounts(userId: string, now = new Date()): Promise<{ lastMinute: number; lastDay: number }> {
  const since = (ms: number) =>
    db
      .select({ n: count() })
      .from(portfolioComments)
      .where(and(eq(portfolioComments.userId, userId), gt(portfolioComments.createdAt, new Date(now.getTime() - ms))));
  const [[minute], [day]] = await Promise.all([since(60_000), since(24 * 3600_000)]);
  return { lastMinute: minute?.n ?? 0, lastDay: day?.n ?? 0 };
}

export async function insertComment(c: { itemId: string; userId: string; body: string; status: CommentStatus }) {
  await db.insert(portfolioComments).values({ portfolioItemId: c.itemId, userId: c.userId, body: c.body, status: c.status });
}

/** Un commento con il lavoro e l'azienda a cui appartiene, per decidere chi può toccarlo. */
export async function getCommentOwner(commentId: string) {
  if (!UUID.test(commentId)) return null;
  const [row] = await db
    .select({ id: portfolioComments.id, authorId: portfolioComments.userId, status: portfolioComments.status, itemId: portfolioItems.id, partnerId: portfolioItems.partnerId })
    .from(portfolioComments)
    .innerJoin(portfolioItems, eq(portfolioItems.id, portfolioComments.portfolioItemId))
    .where(eq(portfolioComments.id, commentId))
    .limit(1);
  return row ?? null;
}

export async function deleteComment(commentId: string) {
  await db.delete(portfolioComments).where(eq(portfolioComments.id, commentId));
}

export async function setCommentStatus(commentId: string, status: CommentStatus) {
  await db.update(portfolioComments).set({ status }).where(eq(portfolioComments.id, commentId));
}

export async function getBlock(partnerId: string, userId: string): Promise<BlockMode | null> {
  const [row] = await db
    .select({ mode: partnerBlocks.mode })
    .from(partnerBlocks)
    .where(and(eq(partnerBlocks.partnerId, partnerId), eq(partnerBlocks.userId, userId)))
    .limit(1);
  return row?.mode ?? null;
}

/** Blocca, limita o libera (`null`) una persona per un'azienda. Chi viene bloccato smette anche di seguirla. */
export async function setBlock(partnerId: string, userId: string, mode: BlockMode | null) {
  if (mode === null) {
    await db.delete(partnerBlocks).where(and(eq(partnerBlocks.partnerId, partnerId), eq(partnerBlocks.userId, userId)));
    return;
  }
  await db.insert(partnerBlocks).values({ partnerId, userId, mode }).onConflictDoUpdate({ target: [partnerBlocks.partnerId, partnerBlocks.userId], set: { mode } });
  if (mode === "blocked") await db.delete(partnerFollows).where(and(eq(partnerFollows.partnerId, partnerId), eq(partnerFollows.userId, userId)));
}

/**
 * Registra una segnalazione (una per account e per commento). Dopo REPORT_AUTO_HOLD segnalazioni aperte di persone
 * diverse un commento visibile torna in attesa di approvazione, in attesa che qualcuno lo guardi.
 * Restituisce false se l'account l'aveva già segnalato.
 */
export async function addReport(r: { commentId: string; reporterId: string; reason: ReportReason; note: string | null }): Promise<boolean> {
  const inserted = await db
    .insert(commentReports)
    .values({ commentId: r.commentId, reporterId: r.reporterId, reason: r.reason, note: r.note })
    .onConflictDoNothing()
    .returning({ id: commentReports.id });
  if (inserted.length === 0) return false;
  const [open] = await db
    .select({ n: count() })
    .from(commentReports)
    .where(and(eq(commentReports.commentId, r.commentId), eq(commentReports.status, "open")));
  if ((open?.n ?? 0) >= REPORT_AUTO_HOLD) {
    await db.update(portfolioComments).set({ status: "pending" }).where(and(eq(portfolioComments.id, r.commentId), eq(portfolioComments.status, "visible")));
  }
  return true;
}

// --- Area Partner → Commenti -------------------------------------------------

/** Commenti in attesa o nascosti sotto i lavori dell'azienda, dal più recente. */
export async function listPartnerComments(partnerId: string, statuses: CommentStatus[]) {
  const rows = await db
    .select({
      id: portfolioComments.id,
      body: portfolioComments.body,
      status: portfolioComments.status,
      createdAt: portfolioComments.createdAt,
      name: users.name,
      itemId: portfolioItems.id,
      itemTitle: portfolioItems.title,
    })
    .from(portfolioComments)
    .innerJoin(portfolioItems, eq(portfolioItems.id, portfolioComments.portfolioItemId))
    .innerJoin(users, eq(users.id, portfolioComments.userId))
    .where(and(eq(portfolioItems.partnerId, partnerId), inArray(portfolioComments.status, statuses)))
    .orderBy(desc(portfolioComments.createdAt))
    .limit(100);
  return rows.map(({ name, ...r }) => ({ ...r, authorName: publicAuthorName(name) }));
}

/** Persone bloccate o limitate dall'azienda. */
export async function listBlocks(partnerId: string) {
  const rows = await db
    .select({ userId: partnerBlocks.userId, mode: partnerBlocks.mode, createdAt: partnerBlocks.createdAt, name: users.name })
    .from(partnerBlocks)
    .innerJoin(users, eq(users.id, partnerBlocks.userId))
    .where(eq(partnerBlocks.partnerId, partnerId))
    .orderBy(desc(partnerBlocks.createdAt));
  return rows.map(({ name, ...r }) => ({ ...r, name: publicAuthorName(name) }));
}

export async function getHiddenWords(partnerId: string): Promise<string[]> {
  const [row] = await db.select({ words: partners.hiddenWords }).from(partners).where(eq(partners.id, partnerId)).limit(1);
  return row?.words ?? [];
}

export async function setHiddenWords(partnerId: string, words: string[]) {
  await db.update(partners).set({ hiddenWords: words }).where(eq(partners.id, partnerId));
}
