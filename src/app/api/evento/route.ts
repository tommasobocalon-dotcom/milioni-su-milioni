import { NextResponse, type NextRequest } from "next/server";
import { recordProfileEvents } from "@/lib/data/stats";
import { parseTrackEvent } from "@/lib/domain/track-event";

/**
 * Visite del profilo e aperture del modulo di contatto, mandate dal browser (TrackEvent) dopo il caricamento.
 * Così le pagine dei profili restano statiche e veloci invece di ricostruirsi a ogni visita per scrivere la riga.
 * Risponde sempre 204: un id che non esiste fa fallire il vincolo sul partner e non scrive nulla.
 */
export async function POST(request: NextRequest) {
  const event = parseTrackEvent(await request.json().catch(() => null));
  if (event) await recordProfileEvents([event.partnerId], event.type).catch(() => {});
  return new NextResponse(null, { status: 204 });
}
