/** Regole della registrazione partner (PRD §6.1): controlli formali sui dati di fatturazione e indirizzo della scheda. */
import { z } from "zod";
import { slugify } from "./format";

/** "IT 007.431.101.57" → "00743110157". */
export function normalizeVatNumber(raw: string): string {
  return raw.trim().replace(/^IT/i, "").replace(/[\s.]/g, "");
}

/** Partita IVA italiana: 11 cifre con cifra di controllo (algoritmo dell'Agenzia delle Entrate). */
export function isValidVatNumber(vat: string): boolean {
  if (!/^\d{11}$/.test(vat) || /^0+$/.test(vat)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const d = Number(vat[i]);
    if (i % 2 === 0) sum += d;
    else sum += d * 2 > 9 ? d * 2 - 9 : d * 2;
  }
  return (10 - (sum % 10)) % 10 === Number(vat[10]);
}

const Pec = z.email();

/**
 * Per la fattura elettronica serve il codice destinatario SDI (7 caratteri) oppure la PEC.
 * "0000000" vuol dire "nessun codice": in quel caso la PEC è obbligatoria.
 */
export function billingContactProblem({ sdiCode, pec }: { sdiCode: string; pec: string }): string | null {
  const code = sdiCode.trim().toUpperCase();
  const mail = pec.trim();
  if (code && !/^[A-Z0-9]{7}$/.test(code)) return "Il codice destinatario ha 7 caratteri tra lettere e numeri";
  if (mail && !Pec.safeParse(mail).success) return "La PEC non è un indirizzo email valido";
  if (code && code !== "0000000") return null;
  if (mail) return null;
  return code ? "Con il codice 0000000 serve la PEC" : "Inserisci il codice destinatario o la PEC";
}

/** Indirizzo della scheda: nome e comune, con un numero se è già preso. */
export function freeSlug(name: string, municipality: string, taken: Set<string>): string {
  const n = slugify(name);
  const m = slugify(municipality);
  const base = n.split("-").includes(m) || n.endsWith(m) ? n : `${n}-${m}`;
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
