/**
 * Interpreta la ricerca libera "cosa ti serve" e la porta alla sezione giusta.
 * Regole semplici e prevedibili.
 * L'ordine conta: le regole più specifiche vengono prima.
 */

export type Intent = { mode: "agency" | "pro"; category?: string; service?: string };

const RULES: [RegExp, Intent][] = [
  [/\bape\b|certificat\w* energetic/, { mode: "pro", category: "geometra", service: "ape" }],
  [/catast/, { mode: "pro", category: "geometra", service: "pratiche-catastali" }],
  [/successi/, { mode: "pro", category: "geometra", service: "successioni" }],
  [/\bcila\b|sanatori/, { mode: "pro", category: "geometra", service: "cila" }],
  [/geometr/, { mode: "pro", category: "geometra" }],
  [/architett|interior|progett/, { mode: "pro", category: "architetto" }],
  [/cappotto/, { mode: "pro", category: "imbianchino", service: "cappotto" }],
  [/imbianc|tinteggi|pittur|pareti/, { mode: "pro", category: "imbianchino" }],
  [/cartongess/, { mode: "pro", category: "ristrutturazioni", service: "cartongesso" }],
  [/ristruttur|impresa edile|muratore/, { mode: "pro", category: "ristrutturazioni" }],
  [/fotovoltaic|pannelli solari/, { mode: "pro", category: "elettricista", service: "fotovoltaico" }],
  [/elettric|corrente|presa|salvavita/, { mode: "pro", category: "elettricista" }],
  [/bagno|doccia|vasca/, { mode: "pro", category: "idraulico", service: "bagno" }],
  [/caldai/, { mode: "pro", category: "idraulico", service: "caldaia" }],
  [/climatizz|condizionator/, { mode: "pro", category: "idraulico", service: "climatizzazione" }],
  [/pompa di calore/, { mode: "pro", category: "idraulico", service: "pompa-di-calore" }],
  [/perdit|tubo|tubi|scarico|lavandino/, { mode: "pro", category: "idraulico", service: "perdite" }],
  [/idraul/, { mode: "pro", category: "idraulico" }],
  [/vend|valuta|stima/, { mode: "agency", service: "valutazione" }],
  [/affitt|locazion/, { mode: "agency", service: "affitti" }],
  [/compr|acquist|\bcasa\b|appartament|agenzi|immobil/, { mode: "agency", service: "compravendita" }],
];

export function interpretQuery(query: string): Intent {
  const q = query
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  for (const [re, intent] of RULES) if (re.test(q)) return intent;
  return { mode: "pro" };
}
