/**
 * Piano gratuito di lancio (soci, 15/11/2026): chi si iscrive nei primi 6 mesi dal lancio usa il Base gratis finché
 * non riceve 3 richieste in tutto (prima erano 3 al mese, cambiato il 21/11/2026). Alla 3ª il gratuito finisce: la scheda
 * sparisce dalla ricerca e l'Area Partner resta ferma sulla pagina Abbonamento finché l'azienda non sceglie un piano
 * a pagamento (con le promo garantite anche dopo i 6 mesi). Codice in syncFreePlan (src/lib/leads/service.ts).
 */
import { promoActive } from "./offers";

export const FREE_LEADS = 3;

/** Si entra nel piano gratuito solo nei primi 6 mesi dal lancio, come per le promo; prima del lancio è aperto. */
export const freePlanOpen = (now: Date, launch: Date | null) => promoActive(now, launch);

export const freeLeadsLeft = (used: number) => Math.max(0, FREE_LEADS - used);
