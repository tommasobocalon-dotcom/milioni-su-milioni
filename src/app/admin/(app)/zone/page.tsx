import { Suspense } from "react";
import { connection } from "next/server";
import { AdminPageHeader, AdminSkeleton, ago, Empty, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { setProvinceOpenAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { getAreaRequestsAdmin } from "@/lib/data/admin";

export const metadata = { title: "Zone" };

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
      <AdminPageHeader title="Zone" subtitle="Province attive e richieste arrivate dalla mappa della Home dove il servizio non c'è ancora" />
      <Panel title="Per provincia">
        <p className="border-b border-line px-5 py-3 text-caption text-ink-2">
          Una provincia attiva compare nei risultati e nella mappa della Home; le altre mostrano &quot;Inoltra una richiesta&quot;. Almeno una resta attiva.
        </p>
        <ul className="divide-y divide-line">
          {provinces.map((p) => (
            <li key={p.code} className="grid gap-2 px-5 py-3 text-body-s md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-4">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold">
                  {p.name}
                  {p.isOpen && <span className="ml-2 text-caption font-semibold text-primary">Attiva</span>}
                </span>
                <span className="truncate text-caption text-ink-2">
                  {p.partners === 1 ? "1 azienda online" : `${p.partners} aziende online`} ·{" "}
                  {p.topCategories.length ? p.topCategories.map((c) => `${c.category} (${c.n})`).join(" · ") : "Nessuna richiesta"}
                </span>
              </span>
              <span className="text-caption text-ink-2">
                <strong className="text-body-s text-ink">{p.total}</strong> richieste in tutto · {p.recent} negli ultimi 30 giorni
              </span>
              <form action={setProvinceOpenAction.bind(null, p.code)}>
                <input type="hidden" name="open" value={p.isOpen ? "0" : "1"} />
                <Button type="submit" size="s" variant={p.isOpen ? "secondary" : "primary"} aria-label={`${p.isOpen ? "Chiudi" : "Apri"} la provincia di ${p.name}`}>
                  {p.isOpen ? "Chiudi" : "Apri"}
                </Button>
              </form>
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
