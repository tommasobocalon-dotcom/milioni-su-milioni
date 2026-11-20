import { NextResponse, type NextRequest } from "next/server";
import { requirePartner } from "@/lib/auth/session";
import { confirmCheckoutReturn } from "@/lib/billing/stripe";
import { logError } from "@/lib/domain/log";

/**
 * Pagina di ritorno dal Checkout di Stripe (success_url). Conferma il pagamento rileggendo la sessione da
 * Stripe, così piano e pacchetti compaiono subito; il webhook resta la rete di sicurezza (stessi effetti, idempotenti).
 */
export async function GET(request: NextRequest) {
  const { partner } = await requirePartner({ allowSuspended: true });
  const sessionId = request.nextUrl.searchParams.get("session_id") ?? "";
  let result: Awaited<ReturnType<typeof confirmCheckoutReturn>> = null;
  if (/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    try {
      result = await confirmCheckoutReturn(sessionId, partner.id);
    } catch (e) {
      // Il webhook completerà l'operazione: il partner vede comunque l'avviso di pagamento in corso.
      logError(`[stripe] conferma al ritorno non riuscita: ${sessionId}`, e);
    }
  }
  const page = result?.kind === "subscription" ? "/area-partner/abbonamento" : "/area-partner/sponsorizzazioni";
  // "ricevuto": già applicato; "ok": avviato, la conferma arriva dal webhook (SEPA o errore temporaneo).
  const anchors: Record<string, string> = { home_sponsor: "#home", search_boost: "#boost", area_extension: "#estensione" };
  const what = anchors[result?.kind ?? ""] ?? "";
  return NextResponse.redirect(new URL(`${page}?pagamento=${result?.confirmed ? "ricevuto" : "ok"}${what}`, request.url), 303);
}
