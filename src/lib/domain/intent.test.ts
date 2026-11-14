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
    // Categorie aggiunte il 14/11/2026: devono vincere su "casa" / "appartamento" (agenzie) e "successione" (geometri).
    ["sgombero cantina", { mode: "pro", category: "sgomberi", service: "cantine-soffitte" }],
    ["svuotare casa dopo una successione", { mode: "pro", category: "sgomberi", service: "dopo-successione" }],
    ["sgomberare un appartamento", { mode: "pro", category: "sgomberi" }],
    ["smaltire ingombranti", { mode: "pro", category: "sgomberi", service: "ingombranti-raee" }],
    ["pulizie di casa", { mode: "pro", category: "impresa-pulizie" }],
    ["pulizia fine cantiere", { mode: "pro", category: "impresa-pulizie", service: "fine-cantiere" }],
    ["pulizia uffici", { mode: "pro", category: "impresa-pulizie", service: "uffici-negozi" }],
    ["giardiniere", { mode: "pro", category: "giardiniere" }],
    ["potatura alberi", { mode: "pro", category: "giardiniere", service: "potatura" }],
    ["taglio dell'erba in giardino", { mode: "pro", category: "giardiniere", service: "taglio-prato-siepi" }],
    ["impianto di irrigazione", { mode: "pro", category: "giardiniere", service: "irrigazione" }],
    ["home staging", { mode: "pro", category: "designer-interni", service: "home-staging" }],
    ["arredare il soggiorno", { mode: "pro", category: "designer-interni" }],
    ["interior designer", { mode: "pro", category: "designer-interni" }],
    // Servizi delle agenzie aggiunti il 14/11/2026.
    ["affitto breve a Venezia", { mode: "agency", service: "affitti-brevi" }],
    ["casa per affitti turistici", { mode: "agency", service: "affitti-brevi" }],
    ["gestione affitti", { mode: "agency", service: "gestione-affitti" }],
    ["affittare un negozio", { mode: "agency", service: "locazione-commerciale" }],
    ["capannone in affitto", { mode: "agency", service: "locazione-commerciale" }],
    ["appartamento in nuova costruzione", { mode: "agency", service: "nuove-costruzioni" }],
    ["comprare un terreno", { mode: "agency", service: "terreni" }],
    ["rustico da ristrutturare in vendita", { mode: "agency", service: "terreni" }],
  ])("%s", (q, expected) => {
    expect(interpretQuery(q)).toEqual(expected);
  });

  it("falls back to all professionals when nothing matches", () => {
    expect(interpretQuery("qualcosa di strano")).toEqual({ mode: "pro" });
    expect(interpretQuery("")).toEqual({ mode: "pro" });
  });
});
