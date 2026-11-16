import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { handleStripeEvent } from "@/lib/billing/stripe";
import { alertTeam } from "@/lib/notify";

/**
 * Webhook Stripe. La firma si verifica sul corpo grezzo prima di leggere qualsiasi campo; gli effetti
 * sono idempotenti, quindi Stripe può ripetere l'evento (risposta non 2xx) senza doppi accrediti.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Stripe non configurato" }, { status: 503 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(body, request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (e) {
    console.error("[stripe] evento non gestito:", event.type, event.id, e);
    await alertTeam(
      "Webhook Stripe non elaborato",
      `Evento ${event.type} (${event.id}): ${e instanceof Error ? e.message : String(e)}\n\nStripe lo riproverà da solo per qualche giorno. Controllare i log di Vercel e, se serve, rimandarlo da Stripe → Sviluppatori → Webhook.`,
    );
    return NextResponse.json({ error: "Errore temporaneo" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
