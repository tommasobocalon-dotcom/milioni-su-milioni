/**
 * Dove il sito è già attivo. Si parte dalla provincia di Treviso (23/11/2026) e ci si allarga dove arrivano più
 * richieste (`province_requests`, pagina Nuove province del gestionale). Per aprire una provincia si aggiunge qui la sigla.
 * Nessun import da server o da librerie: lo usa anche la mappa della Home nel browser.
 */
export const ACTIVE_PROVINCES: readonly string[] = ["TV"];

export const isActiveProvince = (code: string): boolean => ACTIVE_PROVINCES.includes(code);

/** Cosa cerca chi chiede una provincia nuova: basta per capire se servono prima professionisti o agenzie. */
export const PROVINCE_NEEDS = [
  { value: "professional", label: "Un professionista o un artigiano", short: "Professionista" },
  { value: "agency", label: "Un'agenzia immobiliare", short: "Agenzia" },
] as const;

export type ProvinceNeed = (typeof PROVINCE_NEEDS)[number]["value"];

export const PROVINCE_NOTE_MAX = 200;
