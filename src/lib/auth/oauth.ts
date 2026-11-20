import "server-only";
import { randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLogs, oauthAccounts, sessions, users } from "@/lib/db/schema";
import { appleClientSecret, pkceChallenge, type JwtClaims } from "@/lib/domain/oauth";
import { normalizeEmail } from "@/lib/domain/otp";

/**
 * Accesso con Google e Apple (OpenID Connect, authorization code), solo per l'area clienti:
 * le aziende entrano con email e password. Niente librerie esterne: lo stato del giro
 * (state, nonce, PKCE) sta in un cookie httpOnly di 10 minuti.
 */

export type OAuthProvider = "google" | "apple";
export const OAUTH_COOKIE = "geco_oauth";
export const CLIENT_LOGIN_PATH = "/accedi";

// Chiavi pubbliche dei provider per verificare la firma dell'id_token (jose le scarica e le mette in cache).
const jwks = {
  google: createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")),
  apple: createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys")),
};

type Flow = { provider: OAuthProvider; state: string; nonce: string; verifier: string };

export type OAuthProfile = { provider: OAuthProvider; subject: string; email: string | null; emailVerified: boolean; name: string | null };

export class OAuthError extends Error {
  constructor(public code: "config" | "denied" | "state" | "token" | "email") {
    super(`OAuth: ${code}`);
  }
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "apple";
}

function config(provider: OAuthProvider) {
  const env = process.env;
  if (provider === "google") {
    return env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } : null;
  }
  if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) return null;
  return {
    clientId: env.APPLE_CLIENT_ID,
    // Nelle variabili d'ambiente la chiave .p8 arriva spesso su una riga con "\n" letterali.
    clientSecret: () =>
      appleClientSecret(
        { teamId: env.APPLE_TEAM_ID!, keyId: env.APPLE_KEY_ID!, clientId: env.APPLE_CLIENT_ID!, privateKey: env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n") },
        new Date(),
      ),
  };
}

export function isOAuthConfigured(provider: OAuthProvider): boolean {
  return config(provider) !== null;
}

function redirectUri(provider: OAuthProvider, origin: string) {
  return `${process.env.APP_URL ?? origin}/auth/${provider}/callback`;
}

/** Primo passo: URL del provider e valore del cookie con lo stato del giro. */
export function startOAuth(provider: OAuthProvider, origin: string): { url: string; cookie: string } {
  const cfg = config(provider);
  if (!cfg) throw new OAuthError("config");
  const flow: Flow = {
    provider,
    state: randomBytes(16).toString("base64url"),
    nonce: randomBytes(16).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
  };
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri(provider, origin),
    response_type: "code",
    state: flow.state,
    nonce: flow.nonce,
  });
  let base: string;
  if (provider === "google") {
    base = "https://accounts.google.com/o/oauth2/v2/auth";
    params.set("scope", "openid email profile");
    params.set("code_challenge", pkceChallenge(flow.verifier));
    params.set("code_challenge_method", "S256");
    params.set("prompt", "select_account");
  } else {
    // Apple restituisce nome ed email solo con response_mode=form_post (callback in POST).
    base = "https://appleid.apple.com/auth/authorize";
    params.set("scope", "name email");
    params.set("response_mode", "form_post");
  }
  return { url: `${base}?${params}`, cookie: JSON.stringify(flow) };
}

/** Il cookie di Apple deve viaggiare su un POST cross-site: SameSite=None (e quindi Secure). */
export function oauthCookieOptions(provider: OAuthProvider) {
  return {
    httpOnly: true,
    secure: provider === "apple" || process.env.NODE_ENV === "production",
    sameSite: provider === "apple" ? ("none" as const) : ("lax" as const),
    path: "/auth",
    maxAge: 600,
  };
}

/** Secondo passo: controlla lo state, scambia il codice e restituisce il profilo verificato. */
export async function finishOAuth(
  provider: OAuthProvider,
  input: { code: string | null; state: string | null; error: string | null; cookie: string | undefined; appleUser?: string | null; origin: string },
): Promise<OAuthProfile> {
  if (input.error) throw new OAuthError("denied");
  const cfg = config(provider);
  if (!cfg) throw new OAuthError("config");
  let flow: Flow | null = null;
  try {
    flow = input.cookie ? (JSON.parse(input.cookie) as Flow) : null;
  } catch {}
  if (!flow || flow.provider !== provider || !input.state || flow.state !== input.state || !input.code) throw new OAuthError("state");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: redirectUri(provider, input.origin),
    client_id: cfg.clientId,
    client_secret: typeof cfg.clientSecret === "function" ? cfg.clientSecret() : cfg.clientSecret,
  });
  if (provider === "google") body.set("code_verifier", flow.verifier);
  const res = await fetch(provider === "google" ? "https://oauth2.googleapis.com/token" : "https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { id_token?: string };
  if (!res.ok || !json.id_token) throw new OAuthError("token");
  // Verifica crittografica dell'id_token: firma con le chiavi del provider, piu emittente, destinatario e scadenza.
  let claims: JwtClaims;
  try {
    const { payload } = await jwtVerify(json.id_token, jwks[provider], {
      issuer: provider === "google" ? ["https://accounts.google.com", "accounts.google.com"] : "https://appleid.apple.com",
      audience: cfg.clientId,
    });
    if (payload.nonce !== flow.nonce) throw new Error("nonce");
    claims = payload as JwtClaims;
  } catch {
    throw new OAuthError("token");
  }

  let name = typeof claims.name === "string" ? claims.name : null;
  if (provider === "apple" && input.appleUser) {
    // Solo al primo accesso Apple manda {"name":{"firstName","lastName"}} nel form.
    try {
      const n = (JSON.parse(input.appleUser) as { name?: { firstName?: string; lastName?: string } }).name;
      name = [n?.firstName, n?.lastName].filter(Boolean).join(" ") || name;
    } catch {}
  }
  const email = typeof claims.email === "string" ? normalizeEmail(claims.email) : null;
  return {
    provider,
    subject: claims.sub as string,
    email,
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
    name,
  };
}

/**
 * Trova o crea l'utente. Si collega a un account esistente con la stessa email solo se il
 * provider garantisce che l'email è verificata, altrimenti qualcuno potrebbe prendersi l'account.
 */
export async function userForOAuthProfile(profile: OAuthProfile): Promise<string> {
  const [linked] = await db
    .select({ userId: oauthAccounts.userId })
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.provider, profile.provider), eq(oauthAccounts.providerUserId, profile.subject)))
    .limit(1);
  if (linked) return linked.userId;
  if (!profile.email || !profile.emailVerified) throw new OAuthError("email");

  const email = profile.email;
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: users.id, verifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.email, email)).limit(1);
    const userId =
      existing?.id ??
      (await tx.insert(users).values({ email, name: profile.name?.trim() || email.split("@")[0], emailVerifiedAt: new Date() }).returning({ id: users.id }))[0].id;
    if (existing && !existing.verifiedAt) {
      // Account con la password ma email mai confermata: chi l'ha creato non ha dimostrato che l'email è sua, e potrebbe
      // averlo aperto apposta con l'email di un altro per entrarci dopo. Il provider garantisce che l'email è di chi
      // entra adesso: via la password e le sessioni di prima (se era sua, la rimette con "Password dimenticata").
      await tx.update(users).set({ passwordHash: null, emailVerifiedAt: new Date() }).where(eq(users.id, userId));
      await tx.delete(sessions).where(eq(sessions.userId, userId));
    }
    await tx.insert(oauthAccounts).values({ provider: profile.provider, providerUserId: profile.subject, userId }).onConflictDoNothing();
    await tx.insert(auditLogs).values({ actor: email, action: existing ? "auth.oauth_linked" : "auth.oauth_signup", entity: "user", entityId: userId, data: { provider: profile.provider, ...(existing && !existing.verifiedAt && { unconfirmedAccountReset: true }) } });
    return userId;
  });
}
