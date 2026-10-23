/**
 * Registro token (PRD §7.3). Il registro è immutabile: queste funzioni calcolano il saldo e
 * pianificano le nuove righe da aggiungere, non modificano mai quelle esistenti.
 *
 * Accrediti (purchase, credit, refund) aprono un lotto con scadenza. Consumi e scadenze
 * puntano al lotto da cui scalano. Si consumano prima i token che scadono prima.
 */

export type LedgerEntry = {
  id: string;
  kind: "purchase" | "credit" | "consume" | "expire" | "refund";
  amount: number;
  lotId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

export type PlannedDebit = { lotId: string; amount: number };

export class InsufficientTokensError extends Error {
  constructor(
    readonly requested: number,
    readonly available: number,
  ) {
    super(`Token insufficienti: richiesti ${requested}, disponibili ${available}`);
    this.name = "InsufficientTokensError";
  }
}

type Lot = { id: string; remaining: number; expiresAt: Date | null; createdAt: Date };

const isCredit = (e: LedgerEntry) => e.kind === "purchase" || e.kind === "credit" || e.kind === "refund";

function lots(entries: LedgerEntry[]): Lot[] {
  const map = new Map<string, Lot>();
  for (const e of entries) {
    if (isCredit(e)) map.set(e.id, { id: e.id, remaining: e.amount, expiresAt: e.expiresAt, createdAt: e.createdAt });
  }
  for (const e of entries) {
    if (!isCredit(e) && e.lotId) {
      const lot = map.get(e.lotId);
      if (lot) lot.remaining += e.amount;
    }
  }
  return [...map.values()];
}

const isLive = (lot: Lot, now: Date) => !lot.expiresAt || lot.expiresAt.getTime() > now.getTime();

/** Lotti ancora validi con token residui, nell'ordine in cui vanno consumati. */
function liveLots(entries: LedgerEntry[], now: Date): Lot[] {
  return lots(entries)
    .filter((l) => l.remaining > 0 && isLive(l, now))
    .sort((a, b) => {
      const ea = a.expiresAt?.getTime() ?? Infinity;
      const eb = b.expiresAt?.getTime() ?? Infinity;
      return ea - eb || a.createdAt.getTime() - b.createdAt.getTime();
    });
}

export function tokenBalance(entries: LedgerEntry[], now: Date): number {
  return liveLots(entries, now).reduce((sum, l) => sum + l.remaining, 0);
}

export function planConsumption(entries: LedgerEntry[], amount: number, now: Date): PlannedDebit[] {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("La quantità di token deve essere un intero positivo");
  const available = tokenBalance(entries, now);
  if (available < amount) throw new InsufficientTokensError(amount, available);
  const out: PlannedDebit[] = [];
  let left = amount;
  for (const lot of liveLots(entries, now)) {
    if (left === 0) break;
    const take = Math.min(lot.remaining, left);
    out.push({ lotId: lot.id, amount: -take });
    left -= take;
  }
  return out;
}

/** Righe di scadenza per i lotti scaduti che hanno ancora token. */
export function planExpiry(entries: LedgerEntry[], now: Date): PlannedDebit[] {
  return lots(entries)
    .filter((l) => l.remaining > 0 && !isLive(l, now))
    .map((l) => ({ lotId: l.id, amount: -l.remaining }));
}

/** Validità proposta dei token acquistati: 12 mesi. */
export function tokenExpiryFrom(date: Date): Date {
  const d = new Date(date);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
}
