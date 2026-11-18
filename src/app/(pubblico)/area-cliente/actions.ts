"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { destroySession, requireUser } from "@/lib/auth/session";
import { deleteClientAccount, revokeMarketingConsent } from "@/lib/data/client-data";
import type { FormState } from "@/components/ui/message-form";

export async function revokeMarketingAction(): Promise<FormState> {
  const user = await requireUser();
  if (!(await revokeMarketingConsent(user.id))) return { error: "Conferma prima la tua email." };
  revalidatePath("/area-cliente");
  return { ok: "Consenso tolto: non riceverai comunicazioni promozionali." };
}

/** Elimina l'account dopo che il cliente ha scritto ELIMINA nel campo di conferma. */
export async function deleteAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "ELIMINA") return { error: "Scrivi ELIMINA per confermare." };
  const outcome = await deleteClientAccount(user.id);
  if (outcome === "partner" || outcome === "admin")
    return { error: "Questo account gestisce un'azienda o il gestionale: scrivi all'assistenza per eliminarlo." };
  // Le sessioni sono già cancellate con l'utente: qui si toglie anche il cookie.
  await destroySession("client");
  await destroySession("business");
  redirect("/accedi?avviso=account-eliminato");
}
