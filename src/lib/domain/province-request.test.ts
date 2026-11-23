import { describe, expect, it } from "vitest";
import { isActiveProvince } from "./coverage";
import { parseProvinceRequest } from "./province-request";

const base = { province: "PD", need: "professional", place: "", note: "", email: "Anna.Rossi@Example.com " };

describe("isActiveProvince", () => {
  it("all'inizio è attiva solo Treviso", () => {
    expect(isActiveProvince("TV")).toBe(true);
    for (const code of ["VE", "PD", "VR", "VI", "BL", "RO"]) expect(isActiveProvince(code)).toBe(false);
  });
});

describe("parseProvinceRequest", () => {
  it("accetta una provincia non ancora attiva e normalizza l'email", () => {
    expect(parseProvinceRequest(base)).toEqual({
      ok: true,
      data: { provinceId: 28, provinceCode: "PD", provinceName: "Padova", need: "professional", place: null, note: null, email: "anna.rossi@example.com" },
    });
  });

  it("tiene comune e nota, senza spazi in più", () => {
    const res = parseProvinceRequest({ ...base, need: "agency", place: "  Abano Terme (PD) ", note: "  vendere un appartamento  " });
    expect(res.ok && res.data).toMatchObject({ need: "agency", place: "Abano Terme (PD)", note: "vendere un appartamento" });
  });

  it("rifiuta Treviso, dove si può già cercare", () => {
    expect(parseProvinceRequest({ ...base, province: "TV" })).toEqual({
      ok: false,
      field: "province",
      error: "In provincia di Treviso ci siamo già: cerca direttamente professionisti e agenzie.",
    });
  });

  it("rifiuta una provincia che non è del Veneto", () => {
    expect(parseProvinceRequest({ ...base, province: "MI" })).toMatchObject({ ok: false, field: "province" });
  });

  it("chiede cosa si cerca", () => {
    expect(parseProvinceRequest({ ...base, need: "" })).toEqual({ ok: false, field: "need", error: "Scegli cosa cerchi" });
    expect(parseProvinceRequest({ ...base, need: "b2b" })).toMatchObject({ ok: false, field: "need" });
  });

  it("controlla l'email", () => {
    expect(parseProvinceRequest({ ...base, email: "anna@" })).toEqual({ ok: false, field: "email", error: "Controlla l'indirizzo email" });
    expect(parseProvinceRequest({ ...base, email: "" })).toMatchObject({ ok: false, field: "email" });
  });

  it("limita la lunghezza di nota e comune", () => {
    expect(parseProvinceRequest({ ...base, note: "x".repeat(201) })).toMatchObject({ ok: false, field: "note" });
    expect(parseProvinceRequest({ ...base, note: "x".repeat(200) }).ok).toBe(true);
    expect(parseProvinceRequest({ ...base, place: "x".repeat(81) })).toMatchObject({ ok: false, field: "place" });
  });
});
