import { sql } from "drizzle-orm";
import { partners, partnerServices, portfolioItems } from "@/lib/db/schema";

// Per esteso: in una query su una sola tabella Drizzle scrive "id" senza tabella, e nelle sottoquery sarebbe il loro id.
const partnerId = sql.raw('"partners"."id"');

/**
 * Completezza della scheda in percentuale, calcolata dai dati dell'azienda a ogni lettura (la colonna
 * `partners.completeness` la scriveva solo il seed). Pesi: lavori 25, prezzi 20, logo 15, descrizione di almeno
 * 80 caratteri 15, specializzazioni 10, orari 10, anno di fondazione 5.
 */
export const profileCompleteness = sql<number>`(
  case when ${partners.logoUrl} is not null then 15 else 0 end
  + case when length(${partners.description}) >= 80 then 15 else 0 end
  + case when cardinality(${partners.specialties}) > 0 then 10 else 0 end
  + case when jsonb_array_length(${partners.openingHours}) > 0 then 10 else 0 end
  + case when ${partners.foundedYear} is not null then 5 else 0 end
  + case when exists (select 1 from ${partnerServices} ps where ps.partner_id = ${partnerId}) then 20 else 0 end
  + case when exists (select 1 from ${portfolioItems} pi where pi.partner_id = ${partnerId}) then 25 else 0 end
)::int`;
