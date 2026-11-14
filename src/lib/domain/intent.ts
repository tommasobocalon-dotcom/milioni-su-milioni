/**
 * Interpreta la ricerca libera "cosa ti serve" e la porta alla sezione giusta.
 * Regole semplici e prevedibili.
 * L'ordine conta: le regole più specifiche vengono prima.
 */

export type Intent = { mode: "agency" | "pro"; category?: string; service?: string };

const RULES: [RegExp, Intent][] = [
  // Sgomberi, pulizie, giardini e interni prima di geometri ("successione") e agenzie ("casa", "appartamento").
  [/svuot|dopo (una |la )?successione/, { mode: "pro", category: "sgomberi", service: "dopo-successione" }],
  [/sgomber\w* (la |una )?(cantin|soffitt|garage)|cantin\w* da sgomber/, { mode: "pro", category: "sgomberi", service: "cantine-soffitte" }],
  [/ingombrant|raee|smaltiment/, { mode: "pro", category: "sgomberi", service: "ingombranti-raee" }],
  [/sgomber/, { mode: "pro", category: "sgomberi" }],
  [/fine cantiere/, { mode: "pro", category: "impresa-pulizie", service: "fine-cantiere" }],
  [/pulizi\w* (degli |di |dell')?(uffic|negoz)/, { mode: "pro", category: "impresa-pulizie", service: "uffici-negozi" }],
  [/pulizi\w* (dei |delle )?(condomin|scale)/, { mode: "pro", category: "impresa-pulizie", service: "condomini" }],
  [/pulizi|\bpulire\b|colf/, { mode: "pro", category: "impresa-pulizie" }],
  [/potatur|potare/, { mode: "pro", category: "giardiniere", service: "potatura" }],
  [/irrigazion/, { mode: "pro", category: "giardiniere", service: "irrigazione" }],
  [/taglio (del |dell')?(prato|erba|siep)|tagliare (il prato|l'erba|la siepe)/, { mode: "pro", category: "giardiniere", service: "taglio-prato-siepi" }],
  [/giardin|\bprato\b|siep|aiuol/, { mode: "pro", category: "giardiniere" }],
  [/home staging/, { mode: "pro", category: "designer-interni", service: "home-staging" }],
  [/designer|interior|arred/, { mode: "pro", category: "designer-interni" }],
  // Servizi delle agenzie più specifici di "compra / affitta": prima di "ristruttur" (rustico da ristrutturare).
  [/affitt\w* brev|turistic|airbnb|casa vacanz/, { mode: "agency", service: "affitti-brevi" }],
  [/gestion\w* (degli |dell')?affitt/, { mode: "agency", service: "gestione-affitti" }],
  [/negozi|capannon|magazzin|locale commerciale|locali commerciali/, { mode: "agency", service: "locazione-commerciale" }],
  [/nuov\w* costruzion/, { mode: "agency", service: "nuove-costruzioni" }],
  [/terren|rustic/, { mode: "agency", service: "terreni" }],
  [/\bape\b|certificat\w* energetic/, { mode: "pro", category: "geometra", service: "ape" }],
  [/catast/, { mode: "pro", category: "geometra", service: "pratiche-catastali" }],
  [/successi/, { mode: "pro", category: "geometra", service: "successioni" }],
  [/\bcila\b|sanatori/, { mode: "pro", category: "geometra", service: "cila" }],
  [/geometr/, { mode: "pro", category: "geometra" }],
  [/architett|progett/, { mode: "pro", category: "architetto" }],
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
