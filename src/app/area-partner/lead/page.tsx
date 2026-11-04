import { Suspense } from "react";
import { connection } from "next/server";
import { LeadRow } from "@/components/partner/lead-row";
import { LockedLeadsBanner } from "@/components/partner/locked-banner";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { ChipLink } from "@/components/ui/chip";
import { requirePartner } from "@/lib/auth/session";
import { countLeadsByStatus, getOverview, listLeads } from "@/lib/data/partner-area";
import { LEAD_STATUSES } from "@/lib/leads/status";

export const metadata = { title: "Richieste clienti" };

export default function LeadsPage({ searchParams }: PageProps<"/area-partner/lead">) {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      {searchParams.then((sp) => (
        <Leads status={typeof sp.stato === "string" ? sp.stato : undefined} />
      ))}
    </Suspense>
  );
}

async function Leads({ status }: { status?: string }) {
  const { partner } = await requirePartner();
  await connection();
  const now = new Date();
  const [o, counts, rows] = await Promise.all([getOverview(partner.id, now), countLeadsByStatus(partner.id), listLeads(partner.id, status)]);

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title="Richieste clienti"
        subtitle={`${counts.all} richieste ricevute · ${counts.new ?? 0} nuove da gestire`}
        partnerName={partner.displayName} logoUrl={partner.logoUrl}
        planCode={o.sub?.planCode}
      />

      <LockedLeadsBanner leads={o.locked} now={now} />

      <section aria-label="Elenco richieste" className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-2 p-5">
          <ChipLink href="/area-partner/lead" selected={!status}>
            Tutte ({counts.all})
          </ChipLink>
          {LEAD_STATUSES.map((s) => (
            <ChipLink key={s.value} href={`/area-partner/lead?stato=${s.value}`} selected={status === s.value}>
              {s.label} ({counts[s.value] ?? 0})
            </ChipLink>
          ))}
        </div>
        {rows.length === 0 ? (
          <p className="border-t border-line p-8 text-center text-body-s text-ink-2">Nessuna richiesta in questo stato.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {rows.map((l) => (
              <LeadRow key={l.id} lead={l} now={now} />
            ))}
          </ul>
        )}
        <p className="border-t border-line px-5 py-4 text-caption text-ink-2">
          Richiesta non valida (numero inesistente, fuori zona o servizio, spam)? Aprila e segnalala entro 72 ore.
        </p>
      </section>
    </div>
  );
}
