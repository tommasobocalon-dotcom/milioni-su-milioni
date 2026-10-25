import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, verifyPassword } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("accepts the right password and rejects a wrong one", async () => {
    const stored = await hashPassword("una-password-lunga");
    expect(await verifyPassword("una-password-lunga", stored)).toBe(true);
    expect(await verifyPassword("una-password-lungA", stored)).toBe(false);
  });

  it("never stores the password in clear and salts every hash", async () => {
    const a = await hashPassword("stessa-password");
    const b = await hashPassword("stessa-password");
    expect(a).not.toContain("stessa-password");
    expect(a).toMatch(/^scrypt\$/);
    expect(a).not.toBe(b);
  });

  it("rejects malformed or missing hashes without throwing", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "scrypt$abc")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$1$2$3$4$5")).toBe(false);
  });
});

describe("passwordProblem", () => {
  it("requires at least 8 characters", () => {
    expect(passwordProblem("corta")).toMatch(/8 caratteri/);
    expect(passwordProblem("abbastanza")).toBeNull();
  });

  it("caps the length so hashing stays cheap", () => {
    expect(passwordProblem("a".repeat(129))).toMatch(/128/);
  });

  it("refuses passwords that are only spaces", () => {
    expect(passwordProblem("          ")).not.toBeNull();
  });
});
