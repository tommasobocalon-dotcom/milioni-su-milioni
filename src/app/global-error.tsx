"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

/** Errore che rompe anche il layout del sito: lo mandiamo a Sentry e offriamo di riprovare. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="it">
      <body className="flex min-h-screen items-center justify-center bg-page p-6 text-ink">
        <main className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="font-display text-h2">Qualcosa non ha funzionato</h1>
          <p className="text-body text-ink-2">Ce ne siamo accorti e lo sistemiamo. Riprova tra qualche istante.</p>
          <button type="button" onClick={reset} className="h-11 rounded-md bg-primary px-5 font-semibold text-on-brand hover:bg-primary-hover">
            Riprova
          </button>
        </main>
      </body>
    </html>
  );
}
