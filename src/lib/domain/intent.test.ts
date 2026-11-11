import { describe, expect, it } from "vitest";
import { interpretQuery } from "./intent";

describe("interpretQuery", () => {
  it.each([
    ["rifare il bagno", { mode: "pro", category: "idraulico", service: "bagno" }],
    ["Certificato APE", { mode: "pro", category: "geometra", service: "ape" }],
    ["Pratiche catastali", { mode: "pro", category: "geometra", service: "pratiche-catastali" }],
    ["Cappotto termico", { mode: "pro", category: "imbianchino", service: "cappotto" }],
    ["caldaia rotta", { mode: "pro", category: "idraulico", service: "caldaia" }],
    ["elettricista", { mode: "pro", category: "elettricista" }],
    ["ristrutturare casa", { mode: "pro", category: "ristrutturazioni" }],
    ["vendere casa", { mode: "agency", service: "valutazione" }],
    ["Valutazione casa", { mode: "agency", service: "valutazione" }],
    ["comprare un appartamento", { mode: "agency", service: "compravendita" }],
    ["cerco casa in affitto", { mode: "agency", service: "affitti" }],
  ])("%s", (q, expected) => {
    expect(interpretQuery(q)).toEqual(expected);
  });

  it("falls back to all professionals when nothing matches", () => {
    expect(interpretQuery("qualcosa di strano")).toEqual({ mode: "pro" });
    expect(interpretQuery("")).toEqual({ mode: "pro" });
  });
});
