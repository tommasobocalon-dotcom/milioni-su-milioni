"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/message-form";
import { getAnySessionUser, getSessionUser, type SessionUser } from "@/lib/auth/session";
import {
  addReport,
  deleteComment,
  getBlock,
  getCommentContext,
  getCommentOwner,
  insertComment,
  isEmailVerified,
  recentCommentCounts,
  setBlock,
  setCommentStatus,
} from "@/lib/data/comments";
import { isOwnPartner } from "@/lib/data/follows";
import { cleanComment, commentError, initialCommentStatus, REPORT_REASONS, tooManyComments, type ReportReason } from "@/lib/domain/comments";
import { BASE_HIDDEN_WORDS } from "@/lib/domain/hidden-words";
import { ipRateLimited } from "@/lib/security/ip-limit";

/**
 * Chi, tra gli accessi aperti in questo browser (clienti e aziende), gestisce l'azienda: l'autorizzazione a
 * moderare viene sempre dall'essere membro dell'azienda nel database, mai da un dato mandato dal browser.
 */
async function moderatorOf(partnerId: string): Promise<SessionUser | null> {
  for (const audience of ["business", "client"] as const) {
    const user = await getSessionUser(audience);
    if (user && (await isOwnPartner(user.id, partnerId))) return user;
  }
  return null;
}

/** Nuovo commento sotto un lavoro. Regole in src/lib/domain/comments.ts. */
export async function postComment(itemId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getAnySessionUser();
  if (!user) return { error: "Accedi per commentare." };
  if (!(await isEmailVerified(user.id))) return { error: "Per commentare conferma prima la tua email: trovi il link nell'Area cliente." };
  const body = cleanComment(formData.get("body"));
  const invalid = commentError(body);
  if (invalid) return { error: invalid };
  const ctx = typeof itemId === "string" ? await getCommentContext(itemId) : null;
  if (!ctx) return { error: "Questo lavoro non è più disponibile." };
  const block = await getBlock(ctx.partnerId, user.id);
  if (block === "blocked") return { error: "Non puoi commentare i lavori di questa azienda." };
  if (tooManyComments(await recentCommentCounts(user.id))) return { error: "Stai commentando troppo in fretta: riprova tra poco." };
  const status = initialCommentStatus({ body, baseWords: BASE_HIDDEN_WORDS, partnerWords: ctx.hiddenWords, limited: block === "limited" });
  await insertComment({ itemId: ctx.itemId, userId: user.id, body, status });
  revalidatePath(`/ispirazione/${ctx.itemId}`);
  return { ok: status === "pending" ? "Commento inviato: si vedrà dopo l'approvazione dell'azienda." : "Commento pubblicato." };
}

/** L'autore elimina il proprio commento. */
export async function deleteOwnComment(commentId: string) {
  const user = await getAnySessionUser();
  const comment = user && typeof commentId === "string" ? await getCommentOwner(commentId) : null;
  if (!user || !comment || comment.authorId !== user.id) return;
  await deleteComment(comment.id);
  revalidatePath(`/ispirazione/${comment.itemId}`);
}

const REASONS = REPORT_REASONS.map((r) => r.value) as readonly string[];

/** Segnalazione di un commento: anonima per chi è segnalato, una per account e per commento. */
export async function reportComment(commentId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getAnySessionUser();
  if (!user) return { error: "Accedi per segnalare un commento." };
  const reason = formData.get("reason");
  if (typeof reason !== "string" || !REASONS.includes(reason)) return { error: "Scegli il motivo della segnalazione" };
  const note = cleanComment(formData.get("note")).slice(0, 300) || null;
  const comment = typeof commentId === "string" ? await getCommentOwner(commentId) : null;
  if (!comment || comment.status === "removed") return { error: "Questo commento non c'è più." };
  if (comment.authorId === user.id) return { error: "Questo commento è tuo: puoi eliminarlo." };
  if (await ipRateLimited("segnala-commento", 10, 10)) return { error: "Troppe segnalazioni in poco tempo: riprova più tardi." };
  const added = await addReport({ commentId: comment.id, reporterId: user.id, reason: reason as ReportReason, note });
  revalidatePath(`/ispirazione/${comment.itemId}`);
  return { ok: added ? "Segnalazione inviata. Chi ha scritto il commento non saprà che è partita da te." : "Avevi già segnalato questo commento: lo stiamo guardando." };
}

const OPS = ["approve", "hide", "limit", "block", "free"] as const;
type Op = (typeof OPS)[number];

/**
 * L'azienda modera i commenti sotto i propri lavori: approva o mostra di nuovo, nasconde, limita o blocca chi
 * scrive, toglie limite e blocco. Non tocca i commenti tolti dalla piattaforma né chi gestisce l'azienda stessa.
 */
export async function moderateComment(commentId: string, op: Op) {
  if (typeof commentId !== "string" || !OPS.includes(op)) return;
  const comment = await getCommentOwner(commentId);
  if (!comment) return;
  const moderator = await moderatorOf(comment.partnerId);
  if (!moderator) return;
  if (op === "approve" || op === "hide") {
    if (comment.status === "removed") return;
    await setCommentStatus(comment.id, op === "approve" ? "visible" : "hidden");
  } else {
    if (await isOwnPartner(comment.authorId, comment.partnerId)) return;
    await setBlock(comment.partnerId, comment.authorId, op === "free" ? null : op === "block" ? "blocked" : "limited");
  }
  revalidatePath(`/ispirazione/${comment.itemId}`);
  revalidatePath("/area-partner/commenti");
}
