import { scrubText } from "./sentry";

/**
 * Errori scritti nei log del server (Vercel) senza dati personali. Un errore di Drizzle stampato così com'è contiene i
 * parametri della query (nomi, email, testo delle richieste) e quello di PostgreSQL i valori nel dettaglio
 * ("Key (email)=(…)"): qui restano tipo, codice, messaggio pulito e righe dello stack, come per Sentry (scrubText).
 */
export function describeError(e: unknown): string {
  if (e === undefined || e === null) return "";
  if (typeof e === "string") return scrubText(e);
  if (!(e instanceof Error)) return typeof e === "object" ? "[oggetto non stampato]" : String(e);
  const head = (err: Error) => {
    const code = (err as { code?: unknown }).code;
    return `${err.name}${typeof code === "string" ? ` [${code}]` : ""}: ${scrubText(err.message)}`;
  };
  const frames = (e.stack ?? "").split("\n").filter((line) => line.startsWith("    at ")).slice(0, 10);
  const cause = e.cause instanceof Error ? [`Causa: ${head(e.cause)}`] : [];
  return [head(e), ...cause, ...frames].join("\n");
}

/** console.error con l'errore ripulito da describeError. `message` è un testo nostro, senza dati del cliente. */
export function logError(message: string, e?: unknown): void {
  console.error(e === undefined ? message : `${message} ${describeError(e)}`);
}
