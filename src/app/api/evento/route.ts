import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { recordBrowserEvent } from "@/lib/data/stats";
import { databaseUrl } from "@/lib/db/url";
import { clientIp } from "@/lib/security/ip-limit";
import { parseTrackEvent, visitorKey } from "@/lib/domain/track-event";

// Chiave dell'impronta dei visitatori: derivata dalla stringa del database (contiene la password), che c'è sempre sul
// server e non esce mai. Se la password cambia, cambia solo l'impronta: al massimo una visita in più quel giorno.
const VISITOR_SECRET = createHash("sha256").update(`geco-visite|${databaseUrl()}`).digest("hex");

/**
 * Visite del profilo e aperture del modulo di contatto, mandate dal browser (TrackEvent) dopo il caricamento.
 * Così le pagine dei profili restano statiche e veloci invece di ricostruirsi a ogni visita per scrivere la riga.
 * Una sola per visitatore, azienda e giorno (recordBrowserEvent): ricaricare la pagina o chiamare l'indirizzo a mano
 * non gonfia le statistiche. Risponde sempre 204: un id che non esiste fa fallire il vincolo sul partner e non scrive nulla.
 */
export async function POST(request: NextRequest) {
  const event = parseTrackEvent(await request.json().catch(() => null));
  if (event) {
    const visitor = visitorKey(await clientIp(), new Date(), VISITOR_SECRET);
    await recordBrowserEvent(event.partnerId, event.type, visitor).catch(() => {});
  }
  return new NextResponse(null, { status: 204 });
}
