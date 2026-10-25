import { NextResponse, type NextRequest } from "next/server";
import { isOAuthConfigured, isOAuthProvider, OAUTH_COOKIE, oauthCookieOptions, startOAuth } from "@/lib/auth/oauth";

/** "Continua con Google / Apple": manda al provider con state, nonce e PKCE. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isOAuthProvider(provider)) return NextResponse.redirect(new URL("/accedi", request.url), 303);
  if (!isOAuthConfigured(provider)) {
    return NextResponse.redirect(new URL(`/accedi?errore=${provider}-config`, request.url), 303);
  }
  const { url, cookie } = startOAuth(provider, request.nextUrl.origin);
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(OAUTH_COOKIE, cookie, oauthCookieOptions(provider));
  return response;
}
