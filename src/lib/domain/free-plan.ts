/**
 * Piano gratuito di lancio (soci, 15/11/2026): chi si iscrive nei primi 6 mesi dal lancio usa il Base gratis finché
 * non riceve 3 richieste nello stesso mese di calendario. Dalla 4ª la richiesta arriva senza i contatti del cliente,
 * finché l'azienda non sceglie un piano a pagamento (con le promo garantite anche dopo i 6 mesi).
 */
import { promoActive } from "./offers";

export const FREE_LEADS_PER_MONTH = 3;

/** Si entra nel piano gratuito solo nei primi 6 mesi dal lancio, come per le promo; prima del lancio è aperto. */
export const freePlanOpen = (now: Date, launch: Date | null) => promoActive(now, launch);

export const freeLeadsLeft = (usedThisMonth: number) => Math.max(0, FREE_LEADS_PER_MONTH - usedThisMonth);

const romeParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

/** Scarto in millisecondi tra l'ora italiana e UTC in quell'istante (1 o 2 ore). */
function romeOffsetMs(at: Date): number {
  const p = Object.fromEntries(romeParts.formatToParts(at).map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at.getTime() / 1000) * 1000;
}

/** Mezzanotte italiana del 1° del mese in corso: le richieste gratuite si contano da qui. */
export function romeMonthStart(now: Date): Date {
  const local = new Date(now.getTime() + romeOffsetMs(now));
  const midnightAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1);
  // L'ora legale cambia solo di notte a fine marzo e ottobre, mai il 1° del mese: basta lo scarto di quel momento.
  return new Date(midnightAsUtc - romeOffsetMs(new Date(midnightAsUtc)));
}
