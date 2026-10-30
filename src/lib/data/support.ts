import "server-only";
import { and, asc, count, desc, eq, ilike, ne, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { partners, supportMessages, supportTickets, users } from "@/lib/db/schema";
import type { TicketStatus } from "@/lib/domain/support";

/** Letture dei ticket di assistenza: per il Backoffice e, senza note interne, per l'Area Partner. */

const like = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

export async function listTickets({ status, q, limit = 200 }: { status?: TicketStatus; q?: string; limit?: number } = {}) {
  const filters: SQL[] = [];
  if (status) filters.push(eq(supportTickets.status, status));
  const query = q?.trim();
  if (query) {
    const n = /^#?(\d{1,9})$/.exec(query);
    filters.push(
      n
        ? eq(supportTickets.number, Number(n[1]))
        : or(ilike(supportTickets.subject, like(query)), ilike(supportTickets.requesterEmail, like(query)), ilike(supportTickets.requesterName, like(query)))!,
    );
  }
  return db
    .select({
      id: supportTickets.id,
      number: supportTickets.number,
      subject: supportTickets.subject,
      status: supportTickets.status,
      channel: supportTickets.channel,
      topic: supportTickets.topic,
      requesterName: supportTickets.requesterName,
      requesterEmail: supportTickets.requesterEmail,
      lastMessageAt: supportTickets.lastMessageAt,
      partnerName: partners.displayName,
      assigneeName: users.name,
    })
    .from(supportTickets)
    .leftJoin(partners, eq(partners.id, supportTickets.partnerId))
    .leftJoin(users, eq(users.id, supportTickets.assigneeId))
    .where(and(...filters))
    .orderBy(desc(supportTickets.lastMessageAt))
    .limit(limit);
}

export type TicketListItem = Awaited<ReturnType<typeof listTickets>>[number];

export async function countTicketsByStatus(): Promise<Record<TicketStatus | "all", number>> {
  const rows = await db.select({ status: supportTickets.status, n: count() }).from(supportTickets).groupBy(supportTickets.status);
  const counts = { open: 0, waiting: 0, resolved: 0, all: 0 };
  for (const r of rows) {
    counts[r.status] = r.n;
    counts.all += r.n;
  }
  return counts;
}

export async function getTicketAdmin(number: number) {
  const [t] = await db
    .select({
      id: supportTickets.id,
      number: supportTickets.number,
      subject: supportTickets.subject,
      status: supportTickets.status,
      channel: supportTickets.channel,
      topic: supportTickets.topic,
      requesterName: supportTickets.requesterName,
      requesterEmail: supportTickets.requesterEmail,
      userId: supportTickets.userId,
      assigneeId: supportTickets.assigneeId,
      createdAt: supportTickets.createdAt,
      partnerId: partners.id,
      partnerName: partners.displayName,
      assigneeName: users.name,
    })
    .from(supportTickets)
    .leftJoin(partners, eq(partners.id, supportTickets.partnerId))
    .leftJoin(users, eq(users.id, supportTickets.assigneeId))
    .where(eq(supportTickets.number, number))
    .limit(1);
  if (!t) return null;
  const messages = await db
    .select({
      id: supportMessages.id,
      kind: supportMessages.kind,
      authorName: supportMessages.authorName,
      authorUserId: supportMessages.authorUserId,
      body: supportMessages.body,
      createdAt: supportMessages.createdAt,
    })
    .from(supportMessages)
    .where(eq(supportMessages.ticketId, t.id))
    .orderBy(asc(supportMessages.createdAt));
  // Identità verificata solo se chi ha aperto il ticket era entrato con il suo account.
  const verifiedSender = messages[0]?.kind === "inbound" && !!messages[0].authorUserId;
  return { ...t, messages, verifiedSender };
}

export async function listPartnerTickets(partnerId: string) {
  return db
    .select({ number: supportTickets.number, subject: supportTickets.subject, status: supportTickets.status, lastMessageAt: supportTickets.lastMessageAt })
    .from(supportTickets)
    .where(eq(supportTickets.partnerId, partnerId))
    .orderBy(desc(supportTickets.lastMessageAt))
    .limit(50);
}

/** Ticket dell'azienda, con i messaggi visibili al partner: le note interne del team restano fuori. */
export async function getPartnerTicket(partnerId: string, number: number) {
  const [t] = await db
    .select({ id: supportTickets.id, number: supportTickets.number, subject: supportTickets.subject, status: supportTickets.status, createdAt: supportTickets.createdAt })
    .from(supportTickets)
    .where(and(eq(supportTickets.number, number), eq(supportTickets.partnerId, partnerId)))
    .limit(1);
  if (!t) return null;
  const messages = await db
    .select({ id: supportMessages.id, kind: supportMessages.kind, authorName: supportMessages.authorName, body: supportMessages.body, createdAt: supportMessages.createdAt })
    .from(supportMessages)
    .where(and(eq(supportMessages.ticketId, t.id), ne(supportMessages.kind, "note")))
    .orderBy(asc(supportMessages.createdAt));
  return { ...t, messages };
}
