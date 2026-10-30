import { NextResponse, type NextRequest } from "next/server";
import { hasSiteAccess, parseSiteAccess } from "@/lib/domain/site-access";

const WEBHOOKS = new Set(["/api/stripe/webhook", "/api/assistenza/email"]);

/** Sito di prova visibile solo al team: con SITE_ACCESS impostata ogni richiesta chiede nome e password. */
export function proxy(request: NextRequest) {
  // Stripe e il provider email non conoscono le credenziali del team: i webhook hanno firma o token propri (route.ts).
  if (WEBHOOKS.has(request.nextUrl.pathname)) return NextResponse.next();
  const logins = parseSiteAccess(process.env.SITE_ACCESS);
  if (!logins || hasSiteAccess(request.headers.get("authorization"), logins)) return NextResponse.next();
  return new NextResponse("Sito di prova riservato al team.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="geco - sito di prova", charset="UTF-8"' },
  });
}
