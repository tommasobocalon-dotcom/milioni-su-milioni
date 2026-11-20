import { NextResponse, type NextRequest } from "next/server";
import { CLIENT_LOGIN_PATH, finishOAuth, isOAuthProvider, OAUTH_COOKIE, OAuthError, userForOAuthProfile, type OAuthProvider } from "@/lib/auth/oauth";
import { createSession, landingPathFor } from "@/lib/auth/session";
import { logError } from "@/lib/domain/log";

/** Google e Apple aprono solo la sessione cliente: l'Area Partner resta con email e password. */
async function complete(
  request: NextRequest,
  provider: string,
  input: { code: string | null; state: string | null; error: string | null; appleUser?: string | null },
) {
  const audience = "client";
  const loginPath = CLIENT_LOGIN_PATH;
  if (!isOAuthProvider(provider)) return NextResponse.redirect(new URL(loginPath, request.url), 303);
  let target: string;
  try {
    const profile = await finishOAuth(provider as OAuthProvider, {
      ...input,
      cookie: request.cookies.get(OAUTH_COOKIE)?.value,
      origin: request.nextUrl.origin,
    });
    const userId = await userForOAuthProfile(profile);
    await createSession(userId, audience);
    target = await landingPathFor(userId, audience);
  } catch (e) {
    if (!(e instanceof OAuthError)) logError(`[auth] accesso con ${provider} non riuscito:`, e);
    target = `${loginPath}?errore=${provider}-${e instanceof OAuthError ? e.code : "token"}`;
  }
  const response = NextResponse.redirect(new URL(target, request.url), 303);
  response.cookies.delete({ name: OAUTH_COOKIE, path: "/auth" });
  return response;
}

/** Ritorno da Google (query string). */
export async function GET(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const q = request.nextUrl.searchParams;
  return complete(request, (await ctx.params).provider, { code: q.get("code"), state: q.get("state"), error: q.get("error") });
}

/** Ritorno da Apple (response_mode=form_post). */
export async function POST(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const form = await request.formData().catch(() => null);
  const get = (k: string) => (typeof form?.get(k) === "string" ? (form.get(k) as string) : null);
  return complete(request, (await ctx.params).provider, { code: get("code"), state: get("state"), error: get("error"), appleUser: get("user") });
}
