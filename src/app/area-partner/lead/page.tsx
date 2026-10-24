import { Suspense } from "react";
import { Clock, Coins, Inbox, TrendingUp } from "lucide-react";
import { connection } from "next/server";
import { Kpi } from "@/components/partner/kpi";
import { LeadRow } from "@/components/partner/lead-row";
import { LockedLeadsBanner } from "@/components/partner/locked-banner";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { ChipLink } from "@/components/ui/chip";
import { requirePartner } from "@/lib/auth/session";
import { countLeadsByStatus, getOverview, listLeads } from "@/lib/data/partner-area";
import { formatResponseTime } from "@/lib/domain/format";
import { TOKEN_COST_PER_LEAD } from "@/lib/domain/lead-rules";
import { LEAD_STATUSES } from "@/lib/leads/status";

export const metadata = { title: "Lead" };

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
  const contacted = (counts.contacted ?? 0) + (counts.quote_sent ?? 0) + (counts.won ?? 0) + (counts.lost ?? 0);
  const contactRate = counts.all ? Math.round((contacted / counts.all) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title="Lead"
        subtitle={`${counts.all} richieste ricevute · ${counts.new ?? 0} nuove da gestire`}
        partnerName={partner.displayName} logoUrl={partner.logoUrl}
        planCode={o.sub?.planCode}
      />

      <section aria-label="Indicatori" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Inbox} label="Quota lead del periodo" value={o.sub ? `${o.sub.leadsUsed} / ${o.sub.leadsIncluded}` : "—"} note="Si azzera a ogni rinnovo" />
        <Kpi icon={Coins} label="Saldo token" value={String(o.balance)} note={`≈ ${Math.floor(o.balance / TOKEN_COST_PER_LEAD)} lead oltre quota`} />
        <Kpi icon={Clock} label="Tempo medio di risposta" value={formatResponseTime(o.responseMinutes) ?? "—"} />
        <Kpi icon={TrendingUp} label="Lead gestiti" value={`${contactRate}%`} note="Contattati, con preventivo o chiusi" />
      </section>

      <LockedLeadsBanner leads={o.locked} now={now} />

      <section aria-label="Elenco lead" className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-2 p-5">
          <ChipLink href="/area-partner/lead" selected={!status}>
            Tutti ({counts.all})
          </ChipLink>
          {LEAD_STATUSES.map((s) => (
            <ChipLink key={s.value} href={`/area-partner/lead?stato=${s.value}`} selected={status === s.value}>
              {s.label} ({counts[s.value] ?? 0})
            </ChipLink>
          ))}
        </div>
        {rows.length === 0 ? (
          <p className="border-t border-line p-8 text-center text-body-s text-ink-2">Nessun lead in questo stato.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {rows.map((l) => (
              <LeadRow key={l.id} lead={l} now={now} />
            ))}
          </ul>
        )}
        <p className="border-t border-line px-5 py-4 text-caption text-ink-2">
          Puoi segnalare un lead non valido entro 72 ore dalla consegna: numero inesistente, fuori zona o servizio, spam evidente.
        </p>
      </section>
    </div>
  );
}
