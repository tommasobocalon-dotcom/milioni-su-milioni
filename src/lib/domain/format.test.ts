import { describe, expect, it } from "vitest";
import { aLuogo, amountInput, formatEuro, formatPhone, formatPriceRange, formatResponseTime, parseAmount, safeNextPath, slugify } from "./format";

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

describe("formatPhone", () => {
  it("groups Italian mobile and landline numbers for reading", () => {
    expect(formatPhone("+393475551218")).toBe("+39 347 555 1218");
    expect(formatPhone("+390491234567")).toBe("+39 049 123 4567");
  });

  it("leaves other formats untouched", () => {
    expect(formatPhone("+4930123456")).toBe("+4930123456");
  });
});

describe("slugify", () => {
  it("makes readable URL slugs from Italian names", () => {
    expect(slugify("Rossi Impianti")).toBe("rossi-impianti");
    expect(slugify("Società Edile Città d'Este")).toBe("societa-edile-citta-d-este");
  });
});

describe("parseAmount", () => {
  it("legge importi scritti all'italiana e li porta in centesimi", () => {
    expect(parseAmount("1200")).toBe(120000);
    expect(parseAmount("1.200")).toBe(120000);
    expect(parseAmount("1.200,50")).toBe(120050);
    expect(parseAmount("32,5")).toBe(3250);
    expect(parseAmount(" 90 € ")).toBe(9000);
    expect(parseAmount("0")).toBe(0);
  });
  it("accetta il punto come separatore decimale se non sono migliaia", () => {
    expect(parseAmount("32.50")).toBe(3250);
    expect(parseAmount("2.5")).toBe(250);
  });
  it("campo vuoto = nessun prezzo, testo non numerico o negativo = non valido", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
    expect(parseAmount("abc")).toBeNaN();
    expect(parseAmount("-5")).toBeNaN();
    expect(parseAmount("1,2,3")).toBeNaN();
  });
});

describe("amountInput", () => {
  it("riporta i centesimi nel formato del campo", () => {
    expect(amountInput(120000)).toBe("1200");
    expect(amountInput(3250)).toBe("32,5");
    expect(amountInput(null)).toBe("");
  });
});

describe("safeNextPath", () => {
  it("accetta solo percorsi interni al sito", () => {
    expect(safeNextPath("/registrazione-partner")).toBe("/registrazione-partner");
    expect(safeNextPath("/area-partner/abbonamento?piano=media")).toBe("/area-partner/abbonamento?piano=media");
  });

  it("rifiuta indirizzi esterni e trucchi per uscire dal sito", () => {
    expect(safeNextPath("https://esempio.com")).toBeNull();
    expect(safeNextPath("//esempio.com")).toBeNull();
    expect(safeNextPath("/\\esempio.com")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });
});

describe("aLuogo", () => {
  it("usa ad davanti alla a", () => {
    expect(aLuogo("Abano Terme")).toBe("ad Abano Terme");
    expect(aLuogo("Asolo")).toBe("ad Asolo");
  });
  it("usa a negli altri casi", () => {
    expect(aLuogo("Padova")).toBe("a Padova");
    expect(aLuogo("Este")).toBe("a Este");
  });
});
