import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { requirePartner } from "@/lib/auth/session";
import { asPartner } from "@/lib/db/tenant";
import { partners, subscriptions } from "@/lib/db/schema";

/**
 * Piano attivo ma scheda ancora nascosta: il team deve verificare i dati dell'azienda prima di metterla online
 * (listingStatus, 20/11/2026). Va dentro <Suspense>: legge la sessione.
 */
export async function ListingReviewBanner() {
  const { partner } = await requirePartner({ allowSuspended: true });
  if (partner.accountStatus !== "activating") return null;
  const [row] = await asPartner(partner.id, (tx) =>
    tx
      .select({ verification: partners.verificationStatus, plan: subscriptions.id })
      .from(partners)
      .leftJoin(subscriptions, and(eq(subscriptions.partnerId, partners.id), eq(subscriptions.status, "active")))
      .where(eq(partners.id, partner.id))
      .limit(1),
  );
  if (!row?.plan || row.verification === "verified") return null;

  if (row.verification === "rejected") {
    return (
      <div role="status" className="flex gap-3 rounded-lg border border-error bg-error-soft p-4 text-body-s text-ink">
        <ShieldAlert aria-hidden className="size-5 shrink-0 text-error" />
        <p>
          Non siamo riusciti a verificare i dati della tua azienda, quindi la scheda non è online e non ricevi richieste. Scrivi all&apos;
          <Link href="/area-partner/assistenza" className="font-semibold text-primary underline">
            assistenza
          </Link>{" "}
          per sistemarli.
        </p>
      </div>
    );
  }
  return (
    <div role="status" className="flex gap-3 rounded-lg border border-info bg-info-soft p-4 text-body-s text-ink">
      <ShieldCheck aria-hidden className="size-5 shrink-0 text-info" />
      <p>
        <strong>La tua scheda è in verifica.</strong> Controlliamo partita IVA e sede dell&apos;azienda, poi la scheda compare nei risultati e
        ricevi le richieste dei clienti. Nel frattempo puoi completare profilo, listino e lavori.
      </p>
    </div>
  );
}
