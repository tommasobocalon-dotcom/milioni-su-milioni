import { NextResponse, type NextRequest } from "next/server";
import { routeByHost } from "@/lib/domain/admin-host";
import { hasSiteAccess, parseSiteAccess } from "@/lib/domain/site-access";

const WEBHOOKS = new Set(["/api/stripe/webhook", "/api/assistenza/email"]);

/**
 * Sito di prova visibile solo al team: con SITE_ACCESS impostata ogni richiesta chiede nome e password.
 * Con ADMIN_URL il gestionale vive solo sul suo indirizzo (es. admin.gecoitalia.it) e sparisce dal sito.
 */
export function proxy(request: NextRequest) {
  // Stripe e il provider email non conoscono le credenziali del team: i webhook hanno firma o token propri (route.ts).
  if (WEBHOOKS.has(request.nextUrl.pathname)) return NextResponse.next();
  const logins = parseSiteAccess(process.env.SITE_ACCESS);
  if (logins && !hasSiteAccess(request.headers.get("authorization"), logins)) {
    return new NextResponse("Sito di prova riservato al team.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="geco - sito di prova", charset="UTF-8"' },
    });
  }

  const route = routeByHost({
    // L'host vero della richiesta: nextUrl in sviluppo riporta quello del server, non quello chiesto dal browser.
    host: request.headers.get("host") ?? request.nextUrl.host,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    adminUrl: process.env.ADMIN_URL,
    siteUrl: process.env.APP_URL,
  });
  if (route.action === "redirect") return NextResponse.redirect(route.location);
  // Un percorso che non esiste: risponde la pagina 404 del sito.
  if (route.action === "not-found") return NextResponse.rewrite(new URL("/_non-esiste", request.url));
  return NextResponse.next();
}
