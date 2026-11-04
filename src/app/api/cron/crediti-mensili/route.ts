import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { grantMonthlyTokens } from "@/lib/billing/stripe";

/**
 * Cron giornaliero di Vercel (vercel.json): accredita i crediti mensili degli abbonamenti annuali.
 * Con CRON_SECRET impostata (Vercel la manda come "Authorization: Bearer …") accetta solo il cron.
 * Senza, chiunque può chiamarla ma non cambia nulla di più: accredita solo i mesi già maturati e ogni
 * accredito ha una chiave in stripe_processed, quindi chiamarla due volte non dà crediti in più.
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
  return NextResponse.json({ granted: await grantMonthlyTokens() });
}
