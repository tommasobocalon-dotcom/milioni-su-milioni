import { describe, expect, it } from "vitest";
import { checkOtp, generateOtpCode, hashOtp, MAX_OTP_ATTEMPTS, normalizeEmail, normalizeItalianPhone } from "./otp";

describe("generateOtpCode", () => {
  it("returns six digits", () => {
    for (let i = 0; i < 50; i++) expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });
});

describe("hashOtp / checkOtp", () => {
  const pepper = "test-pepper-test-pepper-test-pepper";
  const target = "+393475551218";
  const now = new Date("2026-10-23T10:00:00Z");
  const record = (over: Partial<Parameters<typeof checkOtp>[0]> = {}) => ({
    codeHash: hashOtp("123456", target, pepper),
    target,
    attempts: 0,
    expiresAt: new Date(now.getTime() + 600_000),
    consumedAt: null,
    ...over,
  });

  it("accepts the right code", () => {
    expect(checkOtp(record(), "123456", pepper, now)).toBe("ok");
  });

  it("rejects a wrong code", () => {
    expect(checkOtp(record(), "654321", pepper, now)).toBe("wrong");
  });

  it("binds the code to its target", () => {
    expect(checkOtp(record({ target: "+390000000000" }), "123456", pepper, now)).toBe("wrong");
  });

  it("rejects expired, used or over-tried codes", () => {
    expect(checkOtp(record({ expiresAt: new Date(now.getTime() - 1) }), "123456", pepper, now)).toBe("expired");
    expect(checkOtp(record({ consumedAt: now }), "123456", pepper, now)).toBe("expired");
    expect(checkOtp(record({ attempts: MAX_OTP_ATTEMPTS }), "123456", pepper, now)).toBe("locked");
  });
});

describe("normalizeItalianPhone", () => {
  it("normalizes common Italian formats to E.164", () => {
    expect(normalizeItalianPhone("347 555 1218")).toBe("+393475551218");
    expect(normalizeItalianPhone("+39 347-555-1218")).toBe("+393475551218");
    expect(normalizeItalianPhone("0039 3475551218")).toBe("+393475551218");
    expect(normalizeItalianPhone("049 123 4567")).toBe("+390491234567");
  });

  it("returns null for something that is not a phone number", () => {
    expect(normalizeItalianPhone("ciao")).toBeNull();
    expect(normalizeItalianPhone("123")).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Mario@RossiImpianti.IT ")).toBe("mario@rossiimpianti.it");
  });
});
