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
    ["sgombero cantina", { mode: "pro", category: "traslochi", service: "cantine-soffitte" }],
    ["svuotare casa dopo una successione", { mode: "pro", category: "traslochi", service: "dopo-successione" }],
    ["sgomberare un appartamento", { mode: "pro", category: "traslochi" }],
    ["smaltire ingombranti", { mode: "pro", category: "traslochi", service: "ingombranti-raee" }],
    // Dal 15/11/2026 gli sgomberi sono servizi della categoria Impresa di traslochi.
    ["trasloco", { mode: "pro", category: "traslochi" }],
    ["traslocare casa da Padova a Treviso", { mode: "pro", category: "traslochi", service: "trasloco-casa" }],
    ["trasloco dell'ufficio", { mode: "pro", category: "traslochi", service: "trasloco-uffici" }],
    ["piccolo trasloco", { mode: "pro", category: "traslochi", service: "piccoli-traslochi" }],
    ["deposito mobili", { mode: "pro", category: "traslochi", service: "deposito-mobili" }],
    ["smontaggio e montaggio mobili", { mode: "pro", category: "traslochi", service: "montaggio-mobili" }],
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
    // Categorie e servizi aggiunti il 15/11/2026: devono vincere su "casa" (agenzie), "bagno" (idraulici) e "pulizia" (pulizie).
    ["pulizia piscina", { mode: "pro", category: "giardiniere", service: "piscine" }],
    ["manutenzione della piscina", { mode: "pro", category: "giardiniere", service: "piscine" }],
    ["pulire la vasca del giardino", { mode: "pro", category: "giardiniere", service: "piscine" }],
    ["serramentista", { mode: "pro", category: "serramentista" }],
    ["cambiare gli infissi", { mode: "pro", category: "serramentista" }],
    ["sostituire le finestre di casa", { mode: "pro", category: "serramentista", service: "finestre" }],
    ["porta blindata", { mode: "pro", category: "serramentista", service: "porte-blindate" }],
    ["porte interne", { mode: "pro", category: "serramentista", service: "porte-interne" }],
    ["tapparelle rotte", { mode: "pro", category: "serramentista", service: "tapparelle-persiane" }],
    ["zanzariere", { mode: "pro", category: "serramentista", service: "zanzariere" }],
    ["tenda da sole per il terrazzo", { mode: "pro", category: "serramentista", service: "tende-pergole" }],
    ["piastrellista", { mode: "pro", category: "piastrellista" }],
    ["piastrelle del bagno", { mode: "pro", category: "piastrellista", service: "rivestimento-bagno" }],
    ["posa pavimento in gres", { mode: "pro", category: "piastrellista", service: "posa-pavimenti" }],
    ["rifare il pavimento del terrazzo", { mode: "pro", category: "piastrellista", service: "pavimenti-esterni" }],
    ["pulizia delle finestre", { mode: "pro", category: "impresa-pulizie" }],
    ["pulizia pavimenti", { mode: "pro", category: "impresa-pulizie" }],
    ["rifare il bagno con vasca", { mode: "pro", category: "idraulico", service: "bagno" }],
  ])("%s", (q, expected) => {
    expect(interpretQuery(q)).toEqual(expected);
  });

  it("falls back to all professionals when nothing matches", () => {
    expect(interpretQuery("qualcosa di strano")).toEqual({ mode: "pro" });
    expect(interpretQuery("")).toEqual({ mode: "pro" });
  });
});
