import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { resolveLeadReportAction } from "@/app/admin/actions";
import { AdminPageHeader, AdminSkeleton, dateTime, Empty, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { listLeadReports } from "@/lib/data/admin";
import { REPORT_REASONS } from "@/lib/domain/lead-rules";
import { cn } from "@/lib/utils";

export const metadata = { title: "Segnalazioni lead" };

export default function ReportsPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Reports />
    </Suspense>
  );
}

const DECISION = {
  open: { label: "Da decidere", style: "bg-sponsor text-ink" },
  accepted: { label: "Accolta", style: "bg-subtle text-primary" },
  rejected: { label: "Respinta", style: "bg-muted text-ink-2" },
} as const;

const CHARGE = {
  quota: "Consegnato",
  token: "Consegnato (sistema a pagamento dismesso)",
  locked: "Bloccato oltre quota",
  refunded: "Restituito",
  expired: "Scaduto",
  duplicate: "Duplicato",
  pending: "In verifica",
} as const;

async function Reports() {
  await requireAdmin();
  await connection();
  const rows = await listLeadReports();
  const open = rows.filter((r) => r.reportStatus === "open").length;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Segnalazioni lead"
        subtitle={`${open} da decidere. Se accogli la segnalazione il lead non conta più tra quelli ricevuti dal partner.`}
      />
      <Panel>
        {rows.length === 0 ? (
          <Empty>Nessun lead segnalato dai partner.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const decision = DECISION[r.reportStatus ?? "open"];
              return (
                <li key={r.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-semibold">
                      {r.clientName} · {r.requestType} · {r.municipality}
                    </p>
                    <p className="text-body-s">
                      Motivo: <strong>{REPORT_REASONS.find((x) => x.value === r.reportReason)?.label ?? r.reportReason}</strong>
                    </p>
                    <p className="text-caption text-ink-2">
                      <Link href={`/admin/partner/${r.partnerId}`} className="text-primary underline">
                        {r.partnerName}
                      </Link>{" "}
                      · {CHARGE[r.charge]}
                      {" "}· segnalato il {r.reportedAt ? dateTime.format(r.reportedAt) : "—"}
                    </p>
                  </div>
                  {r.reportStatus === "open" ? (
                    <div className="flex shrink-0 gap-2">
                      <form action={resolveLeadReportAction.bind(null, r.id)}>
                        <input type="hidden" name="decision" value="accept" />
                        <Button type="submit" size="s">
                          Accogli e restituisci
                        </Button>
                      </form>
                      <form action={resolveLeadReportAction.bind(null, r.id)}>
                        <input type="hidden" name="decision" value="reject" />
                        <Button type="submit" size="s" variant="secondary">
                          Respingi
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <span className={cn("inline-flex h-6 shrink-0 items-center self-start rounded-full px-2.5 text-caption font-semibold md:self-center", decision.style)}>{decision.label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
