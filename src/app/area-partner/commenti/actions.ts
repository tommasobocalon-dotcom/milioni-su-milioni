"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/message-form";
import { requirePartner } from "@/lib/auth/session";
import { setBlock, setHiddenWords } from "@/lib/data/comments";
import { parseHiddenWords } from "@/lib/domain/comments";

/** Elenco personale di parole e frasi: un commento che le contiene aspetta l'approvazione dell'azienda. */
export async function saveHiddenWords(_prev: FormState, formData: FormData): Promise<FormState> {
  const { partner } = await requirePartner();
  const words = parseHiddenWords(formData.get("words"));
  await setHiddenWords(partner.id, words);
  revalidatePath("/area-partner/commenti");
  return { ok: words.length === 0 ? "Elenco svuotato: resta attivo solo il filtro di base." : `Elenco salvato: ${words.length} ${words.length === 1 ? "voce" : "voci"}.` };
}

/** Toglie blocco o limite a una persona: l'azienda viene sempre dalla sessione. */
export async function freePerson(userId: string) {
  const { partner } = await requirePartner();
  if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) return;
  await setBlock(partner.id, userId, null);
  revalidatePath("/area-partner/commenti");
}
