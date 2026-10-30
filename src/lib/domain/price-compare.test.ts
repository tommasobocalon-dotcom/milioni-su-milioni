import { describe, expect, it } from "vitest";
import { median, pricePerSqm, priceSummary, scalePosition } from "./price-compare";

describe("median", () => {
  it("takes the middle value, or the mean of the two middle values", () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([40, 10, 20, 30])).toBe(25);
  });
});

describe("priceSummary", () => {
  it("summarises published price ranges: lowest start, typical start, highest end", () => {
    const summary = priceSummary([
      { from: 120000, to: 240000 },
      { from: 140000, to: 260000 },
      { from: 110000, to: null },
    ]);
    expect(summary).toEqual({ min: 110000, median: 120000, max: 260000, count: 3 });
  });

  it("uses the only published bound when the other is missing", () => {
    expect(priceSummary([{ from: null, to: 50000 }])).toEqual({ min: 50000, median: 50000, max: 50000, count: 1 });
  });

  it("keeps free services and skips rows with no price at all", () => {
    expect(priceSummary([{ from: 0, to: 0 }, { from: null, to: null }, { from: 5000, to: null }])).toEqual({
      min: 0,
      median: 2500,
      max: 5000,
      count: 2,
    });
  });

  it("returns null when nobody published a price", () => {
    expect(priceSummary([{ from: null, to: null }])).toBeNull();
  });
});

describe("scalePosition", () => {
  it("places a value between the chart minimum and maximum", () => {
    expect(scalePosition(150, 100, 200)).toBe(0.5);
    expect(scalePosition(100, 100, 200)).toBe(0);
  });

  it("clamps values outside the scale", () => {
    expect(scalePosition(50, 100, 200)).toBe(0);
    expect(scalePosition(250, 100, 200)).toBe(1);
  });

  it("fills the scale when every value is the same", () => {
    expect(scalePosition(100, 100, 100)).toBe(1);
  });
});

describe("pricePerSqm", () => {
  it("averages the price per square metre of the listed homes, rounded to the euro", () => {
    expect(
      pricePerSqm([
        { priceCents: 28500000, sqm: 95 }, // 3.000 €/m²
        { priceCents: 31000000, sqm: 124 }, // 2.500 €/m²
        { priceCents: 33333300, sqm: 100 }, // 3.333,33 €/m²
      ]),
    ).toEqual({ average: 294400, min: 250000, max: 333300, count: 3 });
  });

  it("ignores homes without price or surface", () => {
    expect(pricePerSqm([{ priceCents: null, sqm: 80 }, { priceCents: 7500000, sqm: 0 }, { priceCents: 7500000, sqm: 50 }])).toEqual({
      average: 150000,
      min: 150000,
      max: 150000,
      count: 1,
    });
  });

  it("returns null with nothing to measure", () => {
    expect(pricePerSqm([])).toBeNull();
  });
});
