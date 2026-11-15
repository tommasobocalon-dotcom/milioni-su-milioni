import { describe, expect, it } from "vitest";
import { contractBadge, isMonthlyContract, PROPERTY_CONTRACTS } from "./property-contract";

describe("tipi di contratto degli immobili (15/11/2026)", () => {
  it("oltre a vendita e affitto: asta, affitto con riscatto, nuda proprietà, affitto transitorio", () => {
    expect(PROPERTY_CONTRACTS.map((c) => c.label)).toEqual(["Vendita", "Affitto", "Asta", "Affitto con riscatto", "Nuda proprietà", "Affitto transitorio"]);
  });

  it("ogni contratto ha un indirizzo diverso per il filtro di Ispirazione", () => {
    const slugs = PROPERTY_CONTRACTS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((s) => /^[a-z-]+$/.test(s))).toBe(true);
  });

  it("prezzo al mese solo per gli affitti", () => {
    expect(isMonthlyContract("rent")).toBe(true);
    expect(isMonthlyContract("rent_to_buy")).toBe(true);
    expect(isMonthlyContract("transitional_rent")).toBe(true);
    expect(isMonthlyContract("sale")).toBe(false);
    expect(isMonthlyContract("auction")).toBe(false);
    expect(isMonthlyContract("bare_ownership")).toBe(false);
  });

  it("etichetta sulla foto: disponibile, in trattativa o concluso", () => {
    expect(contractBadge("auction", "available")).toBe("All'asta");
    expect(contractBadge("auction", "sold")).toBe("Aggiudicato");
    expect(contractBadge("rent_to_buy", "sold")).toBe("Affittato");
    expect(contractBadge("bare_ownership", "sold")).toBe("Venduto");
    expect(contractBadge("sale", "negotiating")).toBe("In trattativa");
    expect(contractBadge("rent", null)).toBe("In affitto");
  });
});
