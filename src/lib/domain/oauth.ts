import { createHash, sign } from "node:crypto";

export type JwtClaims = Record<string, unknown>;

/**
 * Legge le claim di un id_token senza verificarne la firma. Si usa solo su token ricevuti
 * direttamente dal token endpoint del provider via TLS (OpenID Connect Core §3.1.3.7).
 */
export function decodeJwtPayload(jwt: string): JwtClaims | null {
  const part = jwt.split(".")[1];
  if (!part) return null;
  try {
    const value = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    return value && typeof value === "object" ? (value as JwtClaims) : null;
  } catch {
    return null;
  }
}

/** Controlli dell'id_token: emittente, destinatario, nonce, scadenza. Null se va bene. */
export function checkIdTokenClaims(
  claims: JwtClaims,
  expected: { issuers: string[]; audience: string; nonce: string; now: Date },
): string | null {
  if (!expected.issuers.includes(String(claims.iss))) return "emittente non valido";
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(expected.audience)) return "destinatario non valido";
  if (claims.nonce !== expected.nonce) return "nonce non valido";
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= expected.now.getTime()) return "token scaduto";
  if (typeof claims.sub !== "string" || !claims.sub) return "utente mancante";
  return null;
}

/** Codice di verifica PKCE (S256). */
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** Il client_secret di Apple è un JWT ES256 firmato con la chiave .p8, valido pochi minuti. */
export function appleClientSecret(
  cfg: { teamId: string; keyId: string; clientId: string; privateKey: string },
  now: Date,
): string {
  const iat = Math.floor(now.getTime() / 1000);
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const data = `${enc({ alg: "ES256", kid: cfg.keyId })}.${enc({ iss: cfg.teamId, iat, exp: iat + 300, aud: "https://appleid.apple.com", sub: cfg.clientId })}`;
  const signature = sign("sha256", Buffer.from(data), { key: cfg.privateKey, dsaEncoding: "ieee-p1363" });
  return `${data}.${signature.toString("base64url")}`;
}
