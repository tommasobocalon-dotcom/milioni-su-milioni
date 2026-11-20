import { NextResponse, type NextRequest } from "next/server";
import { parseInboundEmail } from "@/lib/domain/support";
import { sameSecret, verifySvixSignature } from "@/lib/domain/webhook-signature";
import { receiveEmail } from "@/lib/support/service";
import { logError } from "@/lib/domain/log";

/**
 * Email arrivate alla casella dell'assistenza (istruzioni in ATTIVAZIONE-SERVIZI.md):
 * - Resend Inbound: evento "email.received" firmato (Svix); il testo si legge poi dall'API di Resend.
 * - Altri provider (Postmark, inoltri): JSON con il token segreto nell'URL (?token=INBOUND_EMAIL_TOKEN).
 * Ogni email apre un ticket o si aggiunge a quello indicato da [geco #N] nell'oggetto.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

  let payload: unknown;
  if (request.headers.get("svix-id")) {
    const secret = process.env.RESEND_INBOUND_SECRET;
    if (!secret) return NextResponse.json({ error: "Ricezione email non configurata" }, { status: 503 });
    const signed = verifySvixSignature(
      body,
      { id: request.headers.get("svix-id"), timestamp: request.headers.get("svix-timestamp"), signature: request.headers.get("svix-signature") },
      secret,
    );
    if (!signed) return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
    const event = JSON.parse(body) as { type?: string; data?: Record<string, unknown> };
    if (event.type !== "email.received" || !event.data) return NextResponse.json({ ignored: event.type ?? "evento sconosciuto" });
    try {
      payload = { ...event.data, ...(await fetchResendEmail(String(event.data.email_id ?? ""))) };
    } catch (e) {
      // Risposta 500: Resend ripete l'evento più tardi.
      logError("[assistenza] email Resend non letta:", e);
      return NextResponse.json({ error: "Errore temporaneo" }, { status: 500 });
    }
  } else {
    const token = process.env.INBOUND_EMAIL_TOKEN;
    if (!token) return NextResponse.json({ error: "Ricezione email non configurata" }, { status: 503 });
    if (!sameSecret(request.nextUrl.searchParams.get("token") ?? "", token)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
    }
  }

  const mail = parseInboundEmail(payload);
  // Email illeggibile: 200 comunque, altrimenti il provider la ripropone all'infinito.
  if (!mail) return NextResponse.json({ ignored: "email senza mittente o vuota" });
  try {
    return NextResponse.json(await receiveEmail(mail));
  } catch (e) {
    logError("[assistenza] email non salvata:", e);
    return NextResponse.json({ error: "Errore temporaneo" }, { status: 500 });
  }
}

/** Testo e HTML dell'email ricevuta: il webhook di Resend porta solo i metadati. */
async function fetchResendEmail(id: string): Promise<Record<string, unknown>> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !/^[\w-]+$/.test(id)) throw new Error("RESEND_API_KEY mancante o id email non valido");
  const res = await fetch(`https://api.resend.com/emails/receiving/${id}`, { headers: { authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Resend ha risposto ${res.status}: ${await res.text()}`);
  return (await res.json()) as Record<string, unknown>;
}
