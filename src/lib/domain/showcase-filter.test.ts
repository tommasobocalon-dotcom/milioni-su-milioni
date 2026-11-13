import { describe, expect, it } from "vitest";
import { parseShowcaseFilter, showcaseHref } from "./showcase-filter";

const pros = ["idraulico", "architetto"];

describe("parseShowcaseFilter", () => {
  it("senza parametri: tutti i lavori", () => {
    expect(parseShowcaseFilter({}, pros)).toEqual({});
  });

  it("professionisti, con o senza categoria", () => {
    expect(parseShowcaseFilter({ tipo: "professionisti" }, pros)).toEqual({ type: "pro" });
    expect(parseShowcaseFilter({ tipo: "professionisti", categoria: "idraulico" }, pros)).toEqual({ type: "pro", categorySlug: "idraulico" });
  });

  it("agenzie, con o senza operazione", () => {
    expect(parseShowcaseFilter({ tipo: "agenzie" }, pros)).toEqual({ type: "agency" });
    expect(parseShowcaseFilter({ tipo: "agenzie", operazione: "vendita" }, pros)).toEqual({ type: "agency", contract: "sale" });
    expect(parseShowcaseFilter({ tipo: "agenzie", operazione: "affitto" }, pros)).toEqual({ type: "agency", contract: "rent" });
  });

  it("ignora valori sconosciuti e parametri che non c'entrano col tipo", () => {
    expect(parseShowcaseFilter({ tipo: "boh" }, pros)).toEqual({});
    expect(parseShowcaseFilter({ tipo: "professionisti", categoria: "agenzia-immobiliare" }, pros)).toEqual({ type: "pro" });
    expect(parseShowcaseFilter({ tipo: "agenzie", operazione: "toString" }, pros)).toEqual({ type: "agency" });
    expect(parseShowcaseFilter({ tipo: "agenzie", categoria: "idraulico" }, pros)).toEqual({ type: "agency" });
    expect(parseShowcaseFilter({ tipo: ["professionisti", "agenzie"] }, pros)).toEqual({ type: "pro" });
  });

  it("showcaseHref è l'inverso", () => {
    for (const f of [{}, { type: "pro" }, { type: "pro", categorySlug: "idraulico" }, { type: "agency" }, { type: "agency", contract: "rent" }] as const) {
      const params = Object.fromEntries(new URL(showcaseHref(f), "http://x").searchParams);
      expect(parseShowcaseFilter(params, pros)).toEqual(f);
    }
  });

  it("\"Seguiti\": solo i lavori delle aziende che si seguono, da solo o insieme agli altri filtri", () => {
    expect(parseShowcaseFilter({ seguiti: "1" }, pros)).toEqual({ following: true });
    expect(parseShowcaseFilter({ seguiti: "1", tipo: "agenzie", operazione: "vendita" }, pros)).toEqual({ type: "agency", contract: "sale", following: true });
    expect(parseShowcaseFilter({ seguiti: "no" }, pros)).toEqual({});
    expect(parseShowcaseFilter({ seguiti: ["1", "1"] }, pros)).toEqual({ following: true });
  });

  it("showcaseHref conserva \"Seguiti\" accanto agli altri filtri", () => {
    expect(showcaseHref({ following: true })).toBe("/ispirazione?seguiti=1");
    expect(showcaseHref({ type: "pro", categorySlug: "idraulico", following: true })).toBe("/ispirazione?tipo=professionisti&categoria=idraulico&seguiti=1");
    for (const f of [{ following: true }, { type: "pro", following: true }, { type: "agency", contract: "rent", following: true }] as const) {
      const params = Object.fromEntries(new URL(showcaseHref(f), "http://x").searchParams);
      expect(parseShowcaseFilter(params, pros)).toEqual(f);
    }
  });
});
