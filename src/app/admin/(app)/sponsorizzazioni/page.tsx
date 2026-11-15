import { Suspense } from "react";
import { connection } from "next/server";
import { SponsorshipList } from "@/components/admin/lists";
import { AdminPageHeader, AdminSkeleton, Empty, Panel } from "@/components/admin/ui";
import { ChipLink } from "@/components/ui/chip";
import { requireAdmin } from "@/lib/auth/session";
import { listSponsorshipsAdmin } from "@/lib/data/admin";

export const metadata = { title: "Sponsorizzazioni" };

export default function SponsorshipsPage({ searchParams }: PageProps<"/admin/sponsorizzazioni">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      {searchParams.then((sp) => (
        <Sponsorships ended={sp.filtro === "finite"} />
      ))}
    </Suspense>
  );
}

async function Sponsorships({ ended }: { ended: boolean }) {
  await requireAdmin();
  await connection();
  const now = new Date();
  const rows = await listSponsorshipsAdmin(now, { ended });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Sponsorizzazioni" subtitle="Logo in Home, boost nella ricerca e comuni in più comprati dalle aziende" />
      <Panel>
        <div className="flex flex-wrap gap-2 p-5">
          <ChipLink href="/admin/sponsorizzazioni" selected={!ended}>
            In corso e programmate
          </ChipLink>
          <ChipLink href="/admin/sponsorizzazioni?filtro=finite" selected={ended}>
            Finite negli ultimi 90 giorni
          </ChipLink>
        </div>
        {rows.length === 0 ? (
          <Empty>{ended ? "Nessuna sponsorizzazione finita di recente." : "Nessuna sponsorizzazione in corso."}</Empty>
        ) : (
          <div className="border-t border-line">
            <SponsorshipList rows={rows} now={now} />
          </div>
        )}
      </Panel>
    </div>
  );
}
