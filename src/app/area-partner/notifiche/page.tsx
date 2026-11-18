import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { Mail } from "lucide-react";
import { connection } from "next/server";
import { LeadRow } from "@/components/partner/lead-row";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { requirePartner } from "@/lib/auth/session";
import { listLeads } from "@/lib/data/partner-area";
import { asPartner } from "@/lib/db/tenant";
import { partners } from "@/lib/db/schema";

export const metadata = { title: "Posta in arrivo" };

export default function InboxPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Inbox />
    </Suspense>
  );
}

async function Inbox() {
  const { partner } = await requirePartner();
  await connection();
  const now = new Date();
  const [unread, [contact]] = await Promise.all([
    listLeads(partner.id, "new"),
    asPartner(partner.id, (tx) => tx.select({ email: partners.email }).from(partners).where(eq(partners.id, partner.id))),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title="Posta in arrivo"
        subtitle={unread.length ? `${unread.length} richieste da leggere` : "Sei in pari: nessuna richiesta da leggere"}
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
      />

      <section aria-label="Da leggere" className="rounded-lg border border-line bg-surface">
        {unread.length === 0 ? (
          <p className="p-8 text-center text-body-s text-ink-2">Le nuove richieste dei clienti compariranno qui.</p>
        ) : (
          <ul className="divide-y divide-line">
            {unread.map((l) => (
              <LeadRow key={l.id} lead={l} now={now} />
            ))}
          </ul>
        )}
      </section>

      <p className="inline-flex items-center gap-2 text-body-s text-ink-2">
        <Mail className="size-4 shrink-0" aria-hidden />
        {contact?.email
          ? `Per ogni nuova richiesta ti mandiamo anche un'email a ${contact.email}.`
          : "Aggiungi un'email alla tua scheda per ricevere un avviso a ogni nuova richiesta."}
      </p>
    </div>
  );
}
