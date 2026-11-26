/**
 * Zone in cui il servizio è attivo (soci, 23/11/2026): si parte dalla provincia di Treviso e ci si allarga
 * dove arrivano più richieste. Nelle altre province la mappa della Home invita a inoltrare una richiesta
 * (tabella `area_requests`, conteggio per provincia nel gestionale). Le province si aprono e chiudono dal
 * gestionale → Zone (colonna `provinces.is_open`, letta con `getOpenProvinceCodes`).
 */
export const isProvinceOpen = (code: string, open: readonly string[]) => open.includes(code.toUpperCase());
