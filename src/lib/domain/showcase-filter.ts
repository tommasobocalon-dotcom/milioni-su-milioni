import { PROPERTY_CONTRACTS, type PropertyContract } from "./property-contract";

/**
 * Filtri della pagina Ispirazione, nell'URL: `?tipo=professionisti&categoria=idraulico` oppure
 * `?tipo=agenzie&operazione=vendita`. Valori sconosciuti vengono ignorati.
 */
export type ShowcaseFilter = {
  type?: "pro" | "agency";
  /** Solo con `type: "pro"`. */
  categorySlug?: string;
  /** Solo con `type: "agency"`. */
  contract?: PropertyContract;
};

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
    const contract = PROPERTY_CONTRACTS.find((c) => c.slug === operazione)?.value;
    return contract ? { type: "agency", contract } : { type: "agency" };
  }
  return {};
}

/** Link della pagina con quel filtro. */
export function showcaseHref(f: ShowcaseFilter): string {
  if (f.type === "pro") return f.categorySlug ? `/ispirazione?tipo=professionisti&categoria=${f.categorySlug}` : "/ispirazione?tipo=professionisti";
  if (f.type === "agency") {
    const slug = PROPERTY_CONTRACTS.find((c) => c.value === f.contract)?.slug;
    return slug ? `/ispirazione?tipo=agenzie&operazione=${slug}` : "/ispirazione?tipo=agenzie";
  }
  return "/ispirazione";
}
