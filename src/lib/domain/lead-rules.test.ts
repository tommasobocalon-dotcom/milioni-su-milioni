import { describe, expect, it } from "vitest";
import { canReportLead, decideLeadCharge, isDuplicateLead, REPORT_WINDOW_HOURS, UNLOCK_WINDOW_HOURS } from "./lead-rules";

const now = new Date("2026-10-23T10:00:00Z");

describe("decideLeadCharge", () => {
  const base = {
    accountActive: true,
    isDuplicate: false,
    quotaUsed: 10,
    quotaIncluded: 25,
    tokenBalance: 0,
    autoUseTokens: false,
    tokenCostPerLead: 8,
    now,
  };

  it("counts the lead against the plan quota while there is room", () => {
    expect(decideLeadCharge(base)).toEqual({ kind: "quota" });
  });

  it("cancels duplicates without charging anything", () => {
    expect(decideLeadCharge({ ...base, isDuplicate: true })).toEqual({ kind: "duplicate" });
  });

  it("sends the client to alternatives when the account is not active", () => {
    expect(decideLeadCharge({ ...base, accountActive: false })).toEqual({ kind: "redirect" });
  });

  it("uses tokens automatically over quota when the partner opted in and has enough", () => {
    expect(decideLeadCharge({ ...base, quotaUsed: 25, tokenBalance: 20, autoUseTokens: true })).toEqual({
      kind: "token",
      tokens: 8,
    });
  });

  it("locks the lead for 48 hours over quota without automatic tokens", () => {
    const decision = decideLeadCharge({ ...base, quotaUsed: 25, tokenBalance: 20 });
    expect(decision).toEqual({
      kind: "locked",
      tokens: 8,
      unlockExpiresAt: new Date(now.getTime() + UNLOCK_WINDOW_HOURS * 3600_000),
    });
  });

  it("locks the lead when automatic tokens are on but the balance is too low", () => {
    const decision = decideLeadCharge({ ...base, quotaUsed: 25, tokenBalance: 5, autoUseTokens: true });
    expect(decision.kind).toBe("locked");
  });
});

describe("isDuplicateLead", () => {
  const previous = [
    {
      partnerId: "p1",
      serviceKey: "bagno",
      clientPhone: "+393475551218",
      clientEmail: "marco@example.com",
      createdAt: new Date("2026-10-01T10:00:00Z"),
    },
  ];

  it("flags the same client, partner and service within 30 days", () => {
    expect(
      isDuplicateLead(previous, {
        partnerId: "p1",
        serviceKey: "bagno",
        clientPhone: "+393475551218",
        clientEmail: "altra@example.com",
        createdAt: now,
      }),
    ).toBe(true);
  });

  it("matches on email too, ignoring case", () => {
    expect(
      isDuplicateLead(previous, {
        partnerId: "p1",
        serviceKey: "bagno",
        clientPhone: "+390000000000",
        clientEmail: "MARCO@example.com",
        createdAt: now,
      }),
    ).toBe(true);
  });

  it("does not flag a different service or partner", () => {
    const candidate = { partnerId: "p1", serviceKey: "caldaia", clientPhone: "+393475551218", clientEmail: "x@y.it", createdAt: now };
    expect(isDuplicateLead(previous, candidate)).toBe(false);
    expect(isDuplicateLead(previous, { ...candidate, serviceKey: "bagno", partnerId: "p2" })).toBe(false);
  });

  it("does not flag requests older than 30 days", () => {
    expect(
      isDuplicateLead(previous, {
        partnerId: "p1",
        serviceKey: "bagno",
        clientPhone: "+393475551218",
        clientEmail: "marco@example.com",
        createdAt: new Date("2026-11-05T10:00:00Z"),
      }),
    ).toBe(false);
  });
});

describe("canReportLead", () => {
  const delivered = new Date("2026-10-20T10:00:00Z");

  it("allows a report within 72 hours of delivery", () => {
    expect(canReportLead(delivered, new Date(delivered.getTime() + (REPORT_WINDOW_HOURS - 1) * 3600_000))).toBe(true);
  });

  it("refuses a report after 72 hours", () => {
    expect(canReportLead(delivered, new Date(delivered.getTime() + (REPORT_WINDOW_HOURS + 1) * 3600_000))).toBe(false);
  });

  it("refuses a report on a lead never delivered", () => {
    expect(canReportLead(null, now)).toBe(false);
  });
});
