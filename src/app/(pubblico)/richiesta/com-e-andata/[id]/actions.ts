"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { answerFollowUp } from "@/lib/data/lead-follow-up";

/** Risposta del cliente all'email "Com'è andata?": l'indirizzo con l'id della richiesta basta, come per la conferma. */
export async function answer(leadId: string, contacted: boolean) {
  if (z.uuid().safeParse(leadId).success) await answerFollowUp(leadId, contacted);
  redirect(`/richiesta/com-e-andata/${leadId}`);
}
