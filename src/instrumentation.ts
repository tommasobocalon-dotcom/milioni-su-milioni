import * as Sentry from "@sentry/nextjs";
import { scrubEvent, SENTRY_DATA_COLLECTION } from "@/lib/domain/sentry";

/**
 * Errori del server (pagine, azioni, route API, cron) mandati a Sentry, nella regione UE. Senza NEXT_PUBLIC_SENTRY_DSN
 * non parte niente. Solo errori, niente tracce di prestazioni; dati personali tolti da scrubEvent (DEPLOY.md, "Sentry").
 */
export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    dataCollection: SENTRY_DATA_COLLECTION,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
}

export const onRequestError = Sentry.captureRequestError;
