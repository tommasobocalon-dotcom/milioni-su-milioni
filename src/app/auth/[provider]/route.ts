import { NextResponse, type NextRequest } from "next/server";
import { CLIENT_LOGIN_PATH, isOAuthConfigured, isOAuthProvider, OAUTH_COOKIE, oauthCookieOptions, startOAuth } from "@/lib/auth/oauth";

/**
 * "Continua con Google / Apple": manda al provider con state, nonce e PKCE. Solo per l'area clienti:
 * un vecchio link con ?per=azienda torna all'accesso aziende, dove si entra con email e password.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (request.nextUrl.searchParams.get("per") === "azienda") return NextResponse.redirect(new URL("/accedi/azienda", request.url), 303);
  if (!isOAuthProvider(provider)) return NextResponse.redirect(new URL(CLIENT_LOGIN_PATH, request.url), 303);
  if (!isOAuthConfigured(provider)) {
    return NextResponse.redirect(new URL(`${CLIENT_LOGIN_PATH}?errore=${provider}-config`, request.url), 303);
  }
  const { url, cookie } = startOAuth(provider, request.nextUrl.origin);
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(OAUTH_COOKIE, cookie, oauthCookieOptions(provider));
  return response;
}
