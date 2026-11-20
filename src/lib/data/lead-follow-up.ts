import "server-only";
import { and, eq, gt, inArray, isNotNull, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leads, municipalities, partners } from "@/lib/db/schema";
import { sendEmail } from "@/lib/notify";
import { logError } from "@/lib/domain/log";
import { aLuogo } from "@/lib/domain/format";

const DAY = 24 * 60 * 60 * 1000;
/** L'email parte dopo 3 giorni dalla consegna; oltre 14 non ha più senso chiedere. */
const AFTER_DAYS = 3;
const UNTIL_DAYS = 14;

/**
 * Email "Com'è andata?" ai clienti le cui richieste sono state consegnate da 3 a 14 giorni, una volta sola per
 * richiesta (cron giornaliero, /api/cron/esito-richieste). Esclude chi ha già risposto e le richieste segnalate e
 * accolte. La richiesta viene segnata prima dell'invio, così due esecuzioni insieme non mandano due email; se l'invio
 * fallisce il segno si toglie e si riprova il giorno dopo.
 */
export async function sendFollowUps(now = new Date()): Promise<number> {
  // ponytail: un'unica UPDATE senza limite; a qualche migliaio di richieste al giorno dividere in blocchi.
  const due = await db
    .update(leads)
    .set({ followUpSentAt: now })
    .where(
      and(
        isNull(leads.followUpSentAt),
        isNull(leads.clientContacted),
        isNotNull(leads.deliveredAt),
        lte(leads.deliveredAt, new Date(now.getTime() - AFTER_DAYS * DAY)),
        gt(leads.deliveredAt, new Date(now.getTime() - UNTIL_DAYS * DAY)),
        or(isNull(leads.reportStatus), ne(leads.reportStatus, "accepted")),
      ),
    )
    .returning({ id: leads.id });
  if (due.length === 0) return 0;

  const rows = await db
    .select({
      id: leads.id,
      email: leads.clientEmail,
      name: leads.clientName,
      requestType: leads.requestType,
      municipality: municipalities.name,
      partnerName: partners.displayName,
    })
    .from(leads)
    .innerJoin(partners, eq(partners.id, leads.partnerId))
    .innerJoin(municipalities, eq(municipalities.id, leads.municipalityId))
    .where(inArray(leads.id, due.map((d) => d.id)));

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  let sent = 0;
  for (const r of rows) {
    try {
      await sendEmail(
        r.email,
        `Com'è andata con ${r.partnerName}?`,
        [
          `Ciao ${r.name},`,
          `qualche giorno fa hai chiesto a ${r.partnerName} di ricontattarti per "${r.requestType}" ${aLuogo(r.municipality)}.`,
          `Ti ha richiamato? Diccelo con un clic: ${appUrl}/richiesta/com-e-andata/${r.id}`,
          "Se nessuno si è fatto sentire, nella stessa pagina trovi altre aziende della tua zona a cui chiedere.",
        ].join("\n\n"),
      );
      sent++;
    } catch (e) {
      logError("[email] com'è andata non inviata:", e);
      await db.update(leads).set({ followUpSentAt: null }).where(eq(leads.id, r.id));
    }
  }
  return sent;
}

/** Risposta del cliente dalla pagina /richiesta/com-e-andata/[id]. Solo richieste consegnate; false se non lo è. */
export async function answerFollowUp(leadId: string, contacted: boolean): Promise<boolean> {
  const updated = await db
    .update(leads)
    .set({ clientContacted: contacted, clientAnsweredAt: new Date() })
    .where(and(eq(leads.id, leadId), isNotNull(leads.deliveredAt)))
    .returning({ id: leads.id });
  return updated.length > 0;
}
