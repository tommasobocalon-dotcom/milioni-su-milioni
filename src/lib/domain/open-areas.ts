/**
 * Zone in cui il servizio è attivo (soci, 23/11/2026): si parte dalla provincia di Treviso e ci si allarga
 * dove arrivano più richieste. Nelle altre province la mappa della Home invita a inoltrare una richiesta
 * (tabella `area_requests`, conteggio per provincia nel gestionale). Per aprire una provincia basta aggiungerne la sigla.
 */
export const OPEN_PROVINCES: readonly string[] = ["TV"];

export const isProvinceOpen = (code: string) => OPEN_PROVINCES.includes(code.toUpperCase());
