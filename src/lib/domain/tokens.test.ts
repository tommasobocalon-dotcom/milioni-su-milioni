import { describe, expect, it } from "vitest";
import { InsufficientTokensError, planConsumption, planExpiry, tokenBalance, type LedgerEntry } from "./tokens";

const d = (s: string) => new Date(s);

const ledger: LedgerEntry[] = [
  { id: "lot-old", kind: "purchase", amount: 50, lotId: null, expiresAt: d("2027-01-01T00:00:00Z"), createdAt: d("2026-01-01T00:00:00Z") },
  { id: "lot-new", kind: "purchase", amount: 100, lotId: null, expiresAt: d("2027-09-01T00:00:00Z"), createdAt: d("2026-09-01T00:00:00Z") },
  { id: "c1", kind: "consume", amount: -20, lotId: "lot-old", expiresAt: null, createdAt: d("2026-09-10T00:00:00Z") },
];

describe("tokenBalance", () => {
  it("sums every entry still valid", () => {
    expect(tokenBalance(ledger, d("2026-10-23T00:00:00Z"))).toBe(130);
  });

  it("ignores what is left in expired lots", () => {
    expect(tokenBalance(ledger, d("2027-02-01T00:00:00Z"))).toBe(100);
  });
});

describe("planConsumption", () => {
  it("takes from the lot that expires first", () => {
    expect(planConsumption(ledger, 10, d("2026-10-23T00:00:00Z"))).toEqual([{ lotId: "lot-old", amount: -10 }]);
  });

  it("spans lots when the oldest one is not enough", () => {
    expect(planConsumption(ledger, 40, d("2026-10-23T00:00:00Z"))).toEqual([
      { lotId: "lot-old", amount: -30 },
      { lotId: "lot-new", amount: -10 },
    ]);
  });

  it("skips expired lots", () => {
    expect(planConsumption(ledger, 5, d("2027-02-01T00:00:00Z"))).toEqual([{ lotId: "lot-new", amount: -5 }]);
  });

  it("refuses to go below zero", () => {
    expect(() => planConsumption(ledger, 500, d("2026-10-23T00:00:00Z"))).toThrow(InsufficientTokensError);
  });

  it("refuses non positive amounts", () => {
    expect(() => planConsumption(ledger, 0, d("2026-10-23T00:00:00Z"))).toThrow();
  });
});

describe("planExpiry", () => {
  it("writes off what is left in lots past their expiry, once", () => {
    const now = d("2027-02-01T00:00:00Z");
    const expiry = planExpiry(ledger, now);
    expect(expiry).toEqual([{ lotId: "lot-old", amount: -30 }]);
    const after: LedgerEntry[] = [
      ...ledger,
      { id: "e1", kind: "expire", amount: -30, lotId: "lot-old", expiresAt: null, createdAt: now },
    ];
    expect(planExpiry(after, now)).toEqual([]);
  });
});
