import { describe, expect, it } from "vitest";
import { billingContactProblem, freeSlug, isValidVatNumber, normalizeVatNumber } from "./partner-signup";

describe("isValidVatNumber", () => {
  it("accetta una partita IVA con cifra di controllo corretta", () => {
    expect(isValidVatNumber("00743110157")).toBe(true);
  });

  it("rifiuta cifra di controllo sbagliata, lunghezza errata e lettere", () => {
    expect(isValidVatNumber("00743110158")).toBe(false);
    expect(isValidVatNumber("0074311015")).toBe(false);
    expect(isValidVatNumber("0074311015A")).toBe(false);
  });

  it("rifiuta la partita IVA tutta a zeri", () => {
    expect(isValidVatNumber("00000000000")).toBe(false);
  });
});

describe("normalizeVatNumber", () => {
  it("toglie prefisso IT, spazi e punti", () => {
    expect(normalizeVatNumber(" IT 007.431.101.57 ")).toBe("00743110157");
    expect(normalizeVatNumber("it00743110157")).toBe("00743110157");
  });
});

describe("billingContactProblem", () => {
  it("basta un codice destinatario valido (7 caratteri)", () => {
    expect(billingContactProblem({ sdiCode: "M5UXCR1", pec: "" })).toBeNull();
  });

  it("basta una PEC valida", () => {
    expect(billingContactProblem({ sdiCode: "", pec: "fatture@pec.rossi.it" })).toBeNull();
  });

  it("serve almeno uno dei due", () => {
    expect(billingContactProblem({ sdiCode: "", pec: "" })).toMatch(/codice destinatario o la PEC/);
  });

  it("codice di lunghezza sbagliata o PEC non valida sono errori", () => {
    expect(billingContactProblem({ sdiCode: "ABC", pec: "" })).toMatch(/7 caratteri/);
    expect(billingContactProblem({ sdiCode: "", pec: "non-una-email" })).toMatch(/PEC/);
  });

  it("0000000 da solo non basta: senza codice proprio serve la PEC", () => {
    expect(billingContactProblem({ sdiCode: "0000000", pec: "" })).toMatch(/PEC/);
    expect(billingContactProblem({ sdiCode: "0000000", pec: "fatture@pec.rossi.it" })).toBeNull();
  });
});

describe("freeSlug", () => {
  it("usa nome e comune", () => {
    expect(freeSlug("Idraulica Bianchi", "Padova", new Set())).toBe("idraulica-bianchi-padova");
  });

  it("non ripete il comune se è già nel nome", () => {
    expect(freeSlug("Edilizia Padova", "Padova", new Set())).toBe("edilizia-padova");
  });

  it("aggiunge un numero se lo slug è già preso", () => {
    const taken = new Set(["idraulica-bianchi-padova", "idraulica-bianchi-padova-2"]);
    expect(freeSlug("Idraulica Bianchi", "Padova", taken)).toBe("idraulica-bianchi-padova-3");
  });
});
