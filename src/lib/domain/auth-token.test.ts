import { describe, expect, it } from "vitest";
import { AUTH_TOKEN_TTL_MINUTES, authTokenUsable, hashAuthToken, newAuthToken } from "./auth-token";

describe("token dei link via email", () => {
  it("genera token diversi, lunghi e adatti a un URL", () => {
    const a = newAuthToken();
    const b = newAuthToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("salva solo l'hash, che si ricalcola dal token", () => {
    const { token, hash } = newAuthToken();
    expect(hash).not.toContain(token);
    expect(hashAuthToken(token)).toBe(hash);
  });

  it("il recupero password dura un'ora, la conferma email un giorno", () => {
    expect(AUTH_TOKEN_TTL_MINUTES.password_reset).toBe(60);
    expect(AUTH_TOKEN_TTL_MINUTES.email_verify).toBe(24 * 60);
  });

  it("un token scaduto o già usato non vale più", () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const later = new Date("2026-10-26T12:30:00Z");
    const earlier = new Date("2026-10-26T11:30:00Z");
    expect(authTokenUsable({ expiresAt: later, usedAt: null }, now)).toBe(true);
    expect(authTokenUsable({ expiresAt: earlier, usedAt: null }, now)).toBe(false);
    expect(authTokenUsable({ expiresAt: later, usedAt: earlier }, now)).toBe(false);
  });
});
