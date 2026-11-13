import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { partnerFollows, partnerMembers, partners } from "@/lib/db/schema";

/** Tra queste aziende, quelle che l'account segue già. */
export async function getFollowedPartnerIds(userId: string, partnerIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(partnerIds)];
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: partnerFollows.partnerId })
    .from(partnerFollows)
    .where(and(eq(partnerFollows.userId, userId), inArray(partnerFollows.partnerId, ids)));
  return new Set(rows.map((r) => r.id));
}

/** Quanti account seguono l'azienda. */
export async function getFollowerCount(partnerId: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(partnerFollows).where(eq(partnerFollows.partnerId, partnerId));
  return row?.n ?? 0;
}

/** L'azienda si può seguire solo se è visibile sul sito (attiva). */
export async function isFollowablePartner(partnerId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(partnerId)) return false;
  const [row] = await db.select({ id: partners.id }).from(partners).where(and(eq(partners.id, partnerId), eq(partners.accountStatus, "active"))).limit(1);
  return !!row;
}

/** Vero se l'account gestisce quell'azienda: la propria azienda non si segue, il conto dei follower resta vero. */
export async function isOwnPartner(userId: string, partnerId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: partnerMembers.partnerId })
    .from(partnerMembers)
    .where(and(eq(partnerMembers.userId, userId), eq(partnerMembers.partnerId, partnerId)))
    .limit(1);
  return !!row;
}

/**
 * Segue o smette di seguire e restituisce il conto aggiornato. Dice lo stato voluto, non "inverti": due clic
 * ravvicinati o una richiesta ripetuta non lo ribaltano.
 */
export async function setFollow(userId: string, partnerId: string, following: boolean): Promise<number> {
  if (following) await db.insert(partnerFollows).values({ partnerId, userId }).onConflictDoNothing();
  else await db.delete(partnerFollows).where(and(eq(partnerFollows.partnerId, partnerId), eq(partnerFollows.userId, userId)));
  return getFollowerCount(partnerId);
}
