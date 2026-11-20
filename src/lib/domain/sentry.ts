/**
 * Dati personali tolti dagli errori prima che partano verso Sentry (GDPR, dati in UE): niente cookie, intestazioni di
 * accesso, IP, email, token nei link. Restano l'indirizzo della pagina, il browser e lo stack dell'errore.
 */

type SentryLikeEvent = {
  message?: string;
  exception?: { values?: { value?: string }[] };
  request?: { url?: string; query_string?: unknown; cookies?: unknown; headers?: Record<string, string> };
  user?: { id?: string | number; ip_address?: string | null; email?: string; username?: string };
};

const SECRET_PARAMS = /^(token|code|codice|session_id|key|secret|password|email)$/i;
const SECRET_HEADERS = /^(cookie|set-cookie|authorization|proxy-authorization|x-forwarded-for|x-real-ip|cf-connecting-ip|stripe-signature|svix-signature)$/i;
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;

/** Messaggi d'errore: via le email e i parametri delle query fallite di Drizzle ("params: …"), che hanno i dati dei moduli. */
function scrubText(text: string): string {
  return text.replace(/\nparams: [\s\S]*$/, "\nparams: [nascosti]").replace(EMAIL, "[email]");
}

function scrubQuery(query: string): string {
  const params = new URLSearchParams(query);
  for (const key of [...params.keys()]) if (SECRET_PARAMS.test(key)) params.set(key, "[nascosto]");
  return params.toString();
}

function scrubUrl(url: string): string {
  const i = url.indexOf("?");
  return i < 0 ? url : `${url.slice(0, i)}?${scrubQuery(url.slice(i + 1))}`;
}

export function scrubEvent<T extends SentryLikeEvent>(event: T): T {
  if (event.message) event.message = scrubText(event.message);
  for (const v of event.exception?.values ?? []) if (v.value) v.value = scrubText(v.value);
  if (event.request) {
    delete event.request.cookies;
    if (event.request.url) event.request.url = scrubUrl(event.request.url);
    if (typeof event.request.query_string === "string") event.request.query_string = scrubQuery(event.request.query_string);
    if (event.request.headers) {
      event.request.headers = Object.fromEntries(Object.entries(event.request.headers).filter(([k]) => !SECRET_HEADERS.test(k)));
    }
  }
  if (event.user) event.user = event.user.id === undefined ? {} : { id: event.user.id };
  return event;
}

/**
 * Cosa raccoglie l'SDK di Sentry: per impostazione predefinita prende anche corpi delle richieste (i dati dei moduli),
 * variabili dello stack, cookie, intestazioni e query al database. Qui solo browser, pagina di provenienza e stack.
 */
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { allow: ["user-agent", "referer", "content-type"] }, response: false },
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
};
