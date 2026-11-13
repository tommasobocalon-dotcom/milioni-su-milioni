/**
 * Filtri della pagina Ispirazione, nell'URL: `?tipo=professionisti&categoria=idraulico` oppure
 * `?tipo=agenzie&operazione=vendita`. Valori sconosciuti vengono ignorati.
 */
export type ShowcaseFilter = {
  type?: "pro" | "agency";
  /** Solo con `type: "pro"`. */
  categorySlug?: string;
  /** Solo con `type: "agency"`. */
  contract?: "sale" | "rent";
};

const CONTRACTS = { vendita: "sale", affitto: "rent" } as const;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseShowcaseFilter(params: Params, proCategorySlugs: string[]): ShowcaseFilter {
  const tipo = one(params.tipo);
  if (tipo === "professionisti") {
    const categoria = one(params.categoria);
    return categoria && proCategorySlugs.includes(categoria) ? { type: "pro", categorySlug: categoria } : { type: "pro" };
  }
  if (tipo === "agenzie") {
    const operazione = one(params.operazione);
    const contract = operazione && Object.hasOwn(CONTRACTS, operazione) ? CONTRACTS[operazione as keyof typeof CONTRACTS] : undefined;
    return contract ? { type: "agency", contract } : { type: "agency" };
  }
  return {};
}

/** Link della pagina con quel filtro. */
export function showcaseHref(f: ShowcaseFilter): string {
  if (f.type === "pro") return f.categorySlug ? `/ispirazione?tipo=professionisti&categoria=${f.categorySlug}` : "/ispirazione?tipo=professionisti";
  if (f.type === "agency") return f.contract ? `/ispirazione?tipo=agenzie&operazione=${f.contract === "sale" ? "vendita" : "affitto"}` : "/ispirazione?tipo=agenzie";
  return "/ispirazione";
}
