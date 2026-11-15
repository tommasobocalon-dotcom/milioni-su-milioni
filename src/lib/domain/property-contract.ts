/**
 * Tipi di contratto degli immobili pubblicati dalle agenzie (15/11/2026: oltre a vendita e affitto, asta, affitto con
 * riscatto, nuda proprietà e affitto transitorio). Unico elenco per modulo, scheda pubblica e filtri di Ispirazione;
 * i valori sono quelli dell'enum property_contract del database.
 */
export const PROPERTY_CONTRACTS = [
  { value: "sale", label: "Vendita", badge: "In vendita", done: "Venduto", slug: "vendita", monthly: false },
  { value: "rent", label: "Affitto", badge: "In affitto", done: "Affittato", slug: "affitto", monthly: true },
  { value: "auction", label: "Asta", badge: "All'asta", done: "Aggiudicato", slug: "asta", monthly: false },
  { value: "rent_to_buy", label: "Affitto con riscatto", badge: "Affitto con riscatto", done: "Affittato", slug: "affitto-con-riscatto", monthly: true },
  { value: "bare_ownership", label: "Nuda proprietà", badge: "Nuda proprietà", done: "Venduto", slug: "nuda-proprieta", monthly: false },
  { value: "transitional_rent", label: "Affitto transitorio", badge: "Affitto transitorio", done: "Affittato", slug: "affitto-transitorio", monthly: true },
] as const;

export type PropertyContract = (typeof PROPERTY_CONTRACTS)[number]["value"];

export const PROPERTY_CONTRACT_VALUES = PROPERTY_CONTRACTS.map((c) => c.value) as [PropertyContract, ...PropertyContract[]];

const byValue = (value: PropertyContract) => PROPERTY_CONTRACTS.find((c) => c.value === value)!;

/** Il prezzo è un canone al mese. */
export const isMonthlyContract = (value: PropertyContract) => byValue(value).monthly;

/** Etichetta sulla foto dell'immobile, dato lo stato (disponibile, in trattativa, venduto o affittato). */
export function contractBadge(value: PropertyContract, status: "available" | "negotiating" | "sold" | null): string {
  const c = byValue(value);
  if (status === "sold") return c.done;
  if (status === "negotiating") return "In trattativa";
  return c.badge;
}
