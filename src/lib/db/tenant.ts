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

export type ClientTx = PartnerTx;

/**
 * Esegue le letture dell'Area cliente come ruolo `geco_client` (migrazione 0032): il database mostra solo l'account
 * `userId` e, se la sua email è confermata, le richieste di contatto di quell'email (sono legate all'email, non
 * all'account). L'email confermata la legge qui, dal database, prima di cambiare ruolo: non arriva dal chiamante.
 */
export function asClient<T>(userId: string, fn: (tx: ClientTx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select set_config('app.user_id', ${userId}, true),
        set_config('app.user_email', coalesce((select email from users where id = ${userId} and email_verified_at is not null), ''), true)`);
    // Il ruolo cambia in un secondo momento: la lettura di users qui sopra è ancora quella dell'app.
    await tx.execute(sql`select set_config('role', 'geco_client', true)`);
    return fn(tx);
  });
}
