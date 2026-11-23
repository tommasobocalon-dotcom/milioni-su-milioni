import { Suspense } from "react";
import { connection } from "next/server";
import { AdminPageHeader, AdminSkeleton, ago, Empty, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getAreaRequestsAdmin } from "@/lib/data/admin";
import { isProvinceOpen } from "@/lib/domain/open-areas";

export const metadata = { title: "Richieste per zona" };

export default function AreaRequestsPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AreaRequests />
    </Suspense>
  );
}

async function AreaRequests() {
  await requireAdmin();
  await connection();
  const now = new Date();
  const { provinces, latest } = await getAreaRequestsAdmin(now);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Richieste per zona" subtitle="Chi ha inoltrato una richiesta dalla mappa della Home, nelle province non ancora attive" />
      <Panel title="Per provincia">
        <ul className="divide-y divide-line">
          {provinces.map((p) => (
            <li key={p.code} className="grid gap-1 px-5 py-3 text-body-s md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold">
                  {p.name}
                  {isProvinceOpen(p.code) && <span className="ml-2 text-caption font-semibold text-primary">Attiva</span>}
                </span>
                <span className="truncate text-caption text-ink-2">
                  {p.topCategories.length ? p.topCategories.map((c) => `${c.category} (${c.n})`).join(" · ") : "Nessuna richiesta"}
                </span>
              </span>
              <span className="text-caption text-ink-2">
                <strong className="text-body-s text-ink">{p.total}</strong> in tutto · {p.recent} negli ultimi 30 giorni
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Ultime richieste">
        {latest.length === 0 ? (
          <Empty>Ancora nessuna richiesta.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {latest.map((r) => (
              <li key={r.id} className="grid gap-1 px-5 py-3 text-body-s md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-semibold">
                    {r.category} · {r.municipality ?? r.province}
                  </span>
                  <a href={`mailto:${r.email}`} className="truncate text-caption text-primary underline">
                    {r.email}
                  </a>
                </span>
                <span className="text-caption text-ink-2">{ago(r.createdAt, now)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
