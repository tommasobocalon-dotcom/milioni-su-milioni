"use client";

import { useEffect, useRef } from "react";
import type { BrowserEventType } from "@/lib/domain/track-event";

/**
 * Registra una visita (o l'apertura del modulo di contatto) dal browser, una volta per pagina aperta.
 * Non legge nulla al momento della richiesta: la pagina che lo contiene resta statica. I bot che non eseguono
 * JavaScript non vengono contati.
 */
export function TrackEvent({ partnerId, type }: { partnerId: string; type: BrowserEventType }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    navigator.sendBeacon("/api/evento", new Blob([JSON.stringify({ partnerId, type })], { type: "application/json" }));
  }, [partnerId, type]);
  return null;
}
