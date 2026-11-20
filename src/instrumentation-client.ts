import * as Sentry from "@sentry/nextjs";
import { scrubEvent, SENTRY_DATA_COLLECTION } from "@/lib/domain/sentry";

// Errori nel browser mandati a Sentry (regione UE). Nessun cookie e nessuna registrazione dello schermo, quindi niente
// consenso da chiedere; dati personali tolti da scrubEvent. Senza NEXT_PUBLIC_SENTRY_DSN non parte niente.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    dataCollection: SENTRY_DATA_COLLECTION,
    tracesSampleRate: 0,
    // Solo errori: niente "sessione" mandata a ogni pagina né misure delle prestazioni.
    integrations: (defaults) => defaults.filter((i) => !["BrowserSession", "BrowserTracing"].includes(i.name)),
    beforeSend: (event) => scrubEvent(event),
  });
}
