import { NextResponse, type NextRequest } from "next/server";
import { requirePartner } from "@/lib/auth/session";
import { confirmCheckoutReturn } from "@/lib/billing/stripe";

/**
 * Pagina di ritorno dal Checkout di Stripe (success_url). Conferma il pagamento rileggendo la sessione da
 * Stripe, così crediti e piano compaiono subito; il webhook resta la rete di sicurezza (stessi effetti, idempotenti).
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
      console.error("[stripe] conferma al ritorno non riuscita:", sessionId, e);
    }
  }
  const page = result?.kind === "subscription" ? "/area-partner/abbonamento" : "/area-partner/token";
  // "ricevuto": già applicato; "ok": avviato, la conferma arriva dal webhook (SEPA o errore temporaneo).
  return NextResponse.redirect(new URL(`${page}?pagamento=${result?.confirmed ? "ricevuto" : "ok"}`, request.url), 303);
}
