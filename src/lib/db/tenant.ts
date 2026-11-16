import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./client";

export type PartnerTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Esegue le query dell'Area Partner come ruolo `geco_partner` (migrazione 0029): le policy RLS lasciano leggere e
 * modificare solo le righe dell'azienda `partnerId`, anche se una query dimentica il filtro o riceve l'id di un'altra
 * azienda dall'URL. Ruolo e azienda valgono solo dentro la transazione, quindi funzionano anche col pooler di Supabase
 * in modalità transaction. Il resto del sito (pagine pubbliche, gestionale, webhook Stripe) resta sul ruolo dell'app.
 */
export function asPartner<T>(partnerId: string, fn: (tx: PartnerTx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('role', 'geco_partner', true), set_config('app.partner_id', ${partnerId}, true)`);
    return fn(tx);
  });
}
