import { describe, expect, it } from "vitest";
import { FREE_LEADS, freeLeadsLeft, freePlanOpen } from "./free-plan";

describe("freeLeadsLeft", () => {
  it("allows 3 leads in total", () => {
    expect(FREE_LEADS).toBe(3);
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
