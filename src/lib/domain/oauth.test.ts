import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { appleClientSecret, checkIdTokenClaims, decodeJwtPayload, pkceChallenge } from "./oauth";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = new Date("2026-10-25T10:00:00Z");
const nowSec = Math.floor(now.getTime() / 1000);

describe("decodeJwtPayload", () => {
  it("reads the claims of a JWT", () => {
    expect(decodeJwtPayload(`${b64({ alg: "RS256" })}.${b64({ sub: "123", email: "a@b.it" })}.firma`)).toEqual({ sub: "123", email: "a@b.it" });
  });

  it("returns null on garbage", () => {
    expect(decodeJwtPayload("non-un-jwt")).toBeNull();
    expect(decodeJwtPayload("a.%%%.c")).toBeNull();
  });
});

describe("checkIdTokenClaims", () => {
  const expected = { issuers: ["https://accounts.google.com"], audience: "client-id", nonce: "n1", now };
  const claims = { iss: "https://accounts.google.com", aud: "client-id", nonce: "n1", exp: nowSec + 600, sub: "u1" };

  it("accepts a token meant for us", () => {
    expect(checkIdTokenClaims(claims, expected)).toBeNull();
  });

  it("rejects wrong issuer, audience, nonce, expired tokens and missing subject", () => {
    expect(checkIdTokenClaims({ ...claims, iss: "https://evil.example" }, expected)).not.toBeNull();
    expect(checkIdTokenClaims({ ...claims, aud: "altro" }, expected)).not.toBeNull();
    expect(checkIdTokenClaims({ ...claims, nonce: "n2" }, expected)).not.toBeNull();
    expect(checkIdTokenClaims({ ...claims, exp: nowSec - 1 }, expected)).not.toBeNull();
    expect(checkIdTokenClaims({ ...claims, sub: undefined }, expected)).not.toBeNull();
  });

  it("accepts an audience array that contains us", () => {
    expect(checkIdTokenClaims({ ...claims, aud: ["x", "client-id"] }, expected)).toBeNull();
  });
});

describe("pkceChallenge", () => {
  it("is the S256 challenge from RFC 7636", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("appleClientSecret", () => {
  it("is an ES256 JWT signed with the Apple key", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const jwt = appleClientSecret({ teamId: "TEAM", keyId: "KEY", clientId: "it.geco.web", privateKey: pem }, now);
    const [h, p, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ alg: "ES256", kid: "KEY" });
    expect(decodeJwtPayload(jwt)).toMatchObject({ iss: "TEAM", sub: "it.geco.web", aud: "https://appleid.apple.com", iat: nowSec });
    const ok = verify("sha256", Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"));
    expect(ok).toBe(true);
  });
});
