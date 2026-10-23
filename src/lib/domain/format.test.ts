import { describe, expect, it } from "vitest";
import { formatEuro, formatPriceRange, formatResponseTime, slugify } from "./format";

describe("formatEuro", () => {
  it("uses Italian separators and drops zero cents", () => {
    expect(formatEuro(120000)).toBe("1.200 €");
    expect(formatEuro(3250)).toBe("32,50 €");
  });
});

describe("formatPriceRange", () => {
  it("shows a range with its unit", () => {
    expect(formatPriceRange(120000, 240000, "flat")).toBe("1.200 – 2.400 €");
    expect(formatPriceRange(4500, 6500, "sqm")).toBe("45 – 65 €/m²");
  });

  it("shows a starting price or a single price", () => {
    expect(formatPriceRange(5000, null, "visit")).toBe("da 50 €");
    expect(formatPriceRange(9000, 9000, "flat")).toBe("90 €");
  });

  it("says free when the price is zero", () => {
    expect(formatPriceRange(0, 0, "flat")).toBe("Gratuito");
  });

  it("formats percentages stored in basis points", () => {
    expect(formatPriceRange(200, 300, "percent")).toBe("2 – 3 %");
  });

  it("returns null when nothing is published", () => {
    expect(formatPriceRange(null, null, "flat")).toBeNull();
  });
});

describe("formatResponseTime", () => {
  it("rounds to a human answer", () => {
    expect(formatResponseTime(45)).toBe("meno di 1 ora");
    expect(formatResponseTime(110)).toBe("~2 ore");
    expect(formatResponseTime(60 * 30)).toBe("~1 giorno");
    expect(formatResponseTime(null)).toBeNull();
  });
});

describe("slugify", () => {
  it("makes readable URL slugs from Italian names", () => {
    expect(slugify("Rossi Impianti")).toBe("rossi-impianti");
    expect(slugify("Società Edile Città d'Este")).toBe("societa-edile-citta-d-este");
  });
});
