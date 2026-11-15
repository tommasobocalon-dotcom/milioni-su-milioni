import { describe, expect, it } from "vitest";
import { FREE_LEADS_PER_MONTH, freeLeadsLeft, freePlanOpen, romeMonthStart } from "./free-plan";

describe("romeMonthStart", () => {
  it("starts the month at midnight in Italy, not in UTC", () => {
    // 15 novembre, ora solare (UTC+1): il mese parte il 1° novembre alle 00:00 italiane = 31 ottobre 23:00 UTC.
    expect(romeMonthStart(new Date("2026-11-15T10:00:00Z")).toISOString()).toBe("2026-10-31T23:00:00.000Z");
  });

  it("uses summer time when the month starts in summer (UTC+2)", () => {
    expect(romeMonthStart(new Date("2026-07-20T10:00:00Z")).toISOString()).toBe("2026-06-30T22:00:00.000Z");
  });

  it("counts the first hour of the month in Italy as the new month", () => {
    // 1° dicembre 00:30 in Italia = 30 novembre 23:30 UTC: è già dicembre.
    expect(romeMonthStart(new Date("2026-11-30T23:30:00Z")).toISOString()).toBe("2026-11-30T23:00:00.000Z");
  });
});

describe("freeLeadsLeft", () => {
  it("allows 3 leads a month", () => {
    expect(FREE_LEADS_PER_MONTH).toBe(3);
    expect(freeLeadsLeft(0)).toBe(3);
    expect(freeLeadsLeft(2)).toBe(1);
  });

  it("never goes below zero", () => {
    expect(freeLeadsLeft(3)).toBe(0);
    expect(freeLeadsLeft(7)).toBe(0);
  });
});

describe("freePlanOpen", () => {
  const launch = new Date("2026-12-01T00:00:00Z");

  it("is open before the launch date is set", () => {
    expect(freePlanOpen(new Date("2026-11-15T10:00:00Z"), null)).toBe(true);
  });

  it("is open for the first 6 months after launch", () => {
    expect(freePlanOpen(new Date("2027-05-31T10:00:00Z"), launch)).toBe(true);
  });

  it("closes 6 months after launch", () => {
    expect(freePlanOpen(new Date("2027-06-01T00:00:00Z"), launch)).toBe(false);
  });
});
