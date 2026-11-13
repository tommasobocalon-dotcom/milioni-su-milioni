"use server";

import { getAnySessionUser } from "@/lib/auth/session";
import { getBlock } from "@/lib/data/comments";
import { isFollowablePartner, isOwnPartner, setFollow } from "@/lib/data/follows";
import { getShowcaseItem, setLike } from "@/lib/data/showcase";
import { ipRateLimited } from "@/lib/security/ip-limit";

export type LikeResult = { ok: true; liked: boolean; count: number } | { ok: false; reason: "login" | "missing" | "limit" };

/**
 * "Mi piace" a un lavoro di Ispirazione. Vale l'account di chi ha fatto l'accesso, da cliente o da azienda: l'id
 * dell'utente viene sempre dalla sessione, mai dal browser. Il lavoro deve essere visibile sul sito (azienda attiva).
 */
export async function likeWork(itemId: string, liked: boolean): Promise<LikeResult> {
  const user = await getAnySessionUser();
  if (!user) return { ok: false, reason: "login" };
  if (typeof itemId !== "string" || typeof liked !== "boolean") return { ok: false, reason: "missing" };
  // Freno ai clic a raffica (script): 60 al minuto bastano a chiunque sfogli la pagina.
  if (await ipRateLimited("mi-piace", 60, 1)) return { ok: false, reason: "limit" };
  const item = await getShowcaseItem(itemId);
  if (!item) return { ok: false, reason: "missing" };
  const count = await setLike(user.id, item.id, liked);
  return { ok: true, liked, count };
}

export type FollowResult = { ok: true; following: boolean; count: number } | { ok: false; reason: "login" | "missing" | "limit" | "own" | "blocked" };

/**
 * "Segui" su un'azienda. Come per il mi piace vale l'account della sessione, da cliente o da azienda. L'azienda deve
 * essere attiva; la propria non si segue, così il conto dei follower resta vero.
 */
export async function followPartner(partnerId: string, following: boolean): Promise<FollowResult> {
  const user = await getAnySessionUser();
  if (!user) return { ok: false, reason: "login" };
  if (typeof partnerId !== "string" || typeof following !== "boolean") return { ok: false, reason: "missing" };
  if (await ipRateLimited("segui", 30, 1)) return { ok: false, reason: "limit" };
  if (!(await isFollowablePartner(partnerId))) return { ok: false, reason: "missing" };
  if (following && (await isOwnPartner(user.id, partnerId))) return { ok: false, reason: "own" };
  // Chi è stato bloccato dall'azienda non può seguirla (smettere di seguire resta sempre possibile).
  if (following && (await getBlock(partnerId, user.id)) === "blocked") return { ok: false, reason: "blocked" };
  const count = await setFollow(user.id, partnerId, following);
  return { ok: true, following, count };
}
