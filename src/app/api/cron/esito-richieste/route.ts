import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sendFollowUps } from "@/lib/data/lead-follow-up";

/**
 * Cron giornaliero di Vercel (vercel.json): email "Com'è andata?" ai clienti 3 giorni dopo la consegna della richiesta.
 * Con CRON_SECRET impostata (Vercel la manda come "Authorization: Bearer …") accetta solo il cron. Senza, chiunque può
 * chiamarla ma non cambia nulla di più: ogni richiesta riceve l'email una volta sola (follow_up_sent_at).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const given = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${secret}`);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
  }
  return NextResponse.json({ sent: await sendFollowUps() });
}
