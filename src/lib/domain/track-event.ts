/** Eventi che il browser può segnalare a /api/evento. Le impressioni no: le registra il server con la ricerca. */
export type BrowserEventType = "view" | "contact_click";

const TYPES: readonly string[] = ["view", "contact_click"] satisfies BrowserEventType[];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Controlla il corpo della richiesta: null se non è un evento valido. */
export function parseTrackEvent(body: unknown): { partnerId: string; type: BrowserEventType } | null {
  if (typeof body !== "object" || body === null) return null;
  const { partnerId, type } = body as Record<string, unknown>;
  if (typeof partnerId !== "string" || !UUID.test(partnerId)) return null;
  if (typeof type !== "string" || !TYPES.includes(type)) return null;
  return { partnerId, type: type as BrowserEventType };
}
