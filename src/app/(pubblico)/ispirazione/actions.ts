"use server";

import { getAnySessionUser } from "@/lib/auth/session";
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
