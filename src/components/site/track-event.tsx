import { connection } from "next/server";
import { recordProfileEvents } from "@/lib/data/stats";

/** Registra una visita al momento della richiesta (non nel prerender). Va messo dentro un Suspense. */
export async function TrackEvent({ partnerId, type }: { partnerId: string; type: "view" | "contact_click" }) {
  await connection();
  await recordProfileEvents([partnerId], type);
  return null;
}
