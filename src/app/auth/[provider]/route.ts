import { NextResponse, type NextRequest } from "next/server";
import {
  audienceFromParam,
  isOAuthConfigured,
  isOAuthProvider,
  loginPathFor,
  OAUTH_AUDIENCE_COOKIE,
  OAUTH_COOKIE,
  oauthCookieOptions,
  startOAuth,
} from "@/lib/auth/oauth";

/** "Continua con Google / Apple": manda al provider con state, nonce e PKCE. ?per=azienda se si parte dall'accesso aziende. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const audience = audienceFromParam(request.nextUrl.searchParams.get("per"));
  const loginPath = loginPathFor(audience);
  if (!isOAuthProvider(provider)) return NextResponse.redirect(new URL(loginPath, request.url), 303);
  if (!isOAuthConfigured(provider)) {
    return NextResponse.redirect(new URL(`${loginPath}?errore=${provider}-config`, request.url), 303);
  }
  const { url, cookie } = startOAuth(provider, request.nextUrl.origin);
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(OAUTH_COOKIE, cookie, oauthCookieOptions(provider));
  if (audience === "business") response.cookies.set(OAUTH_AUDIENCE_COOKIE, "azienda", oauthCookieOptions(provider));
  else response.cookies.delete({ name: OAUTH_AUDIENCE_COOKIE, path: "/auth" });
  return response;
}
