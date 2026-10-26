import { createHash, randomBytes } from "node:crypto";

/** Link monouso inviati per email. Nel database finisce solo l'hash: chi legge la tabella non può usarli. */
export type AuthTokenPurpose = "password_reset" | "email_verify";

export const AUTH_TOKEN_TTL_MINUTES: Record<AuthTokenPurpose, number> = {
  password_reset: 60,
  email_verify: 24 * 60,
};

export const hashAuthToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function newAuthToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashAuthToken(token) };
}

export function authTokenUsable(row: { expiresAt: Date; usedAt: Date | null }, now: Date = new Date()): boolean {
  return !row.usedAt && row.expiresAt > now;
}
