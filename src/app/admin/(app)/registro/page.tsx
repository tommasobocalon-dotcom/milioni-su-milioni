import { Suspense } from "react";
import { Search } from "lucide-react";
import { connection } from "next/server";
import { actionLabel, AdminPageHeader, AdminSkeleton, dateTime, Empty, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/session";
import { listAudit } from "@/lib/data/admin";

export const metadata = { title: "Registro attività" };

export default function AuditPage({ searchParams }: PageProps<"/admin/registro">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      {searchParams.then((sp) => (
        <Audit q={typeof sp.q === "string" ? sp.q : undefined} />
      ))}
    </Suspense>
  );
}

async function Audit({ q }: { q?: string }) {
  await requireAdmin();
  await connection();
  const rows = await listAudit(q);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Registro attività" subtitle="Accessi, registrazioni, pagamenti di prova e ogni azione fatta dal gestionale. Le ultime 300 righe." />
      <Panel>
        <form role="search" className="flex gap-2 p-5" action="/admin/registro">
          <label htmlFor="cerca-registro" className="sr-only">
            Cerca per persona, azione o id
          </label>
          <Input id="cerca-registro" name="q" defaultValue={q} placeholder="Email, azione (es. partner.suspend) o id" className="h-9 md:w-96" />
          <Button type="submit" size="s" variant="secondary" aria-label="Cerca">
            <Search aria-hidden />
          </Button>
        </form>
        {rows.length === 0 ? (
          <Empty>Nessuna attività trovata.</Empty>
        ) : (
          <div tabIndex={0} role="region" aria-label="Registro attività" className="overflow-x-auto border-t border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <table className="w-full min-w-[640px] text-left text-body-s">
              <thead className="bg-muted text-caption text-ink-2">
                <tr>
                  <th scope="col" className="px-5 py-2 font-semibold">Quando</th>
                  <th scope="col" className="px-5 py-2 font-semibold">Chi</th>
                  <th scope="col" className="px-5 py-2 font-semibold">Cosa</th>
                  <th scope="col" className="px-5 py-2 font-semibold">Su</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-2 whitespace-nowrap text-ink-2">{dateTime.format(r.createdAt)}</td>
                    <td className="max-w-56 truncate px-5 py-2">{r.actor}</td>
                    <td className="px-5 py-2">
                      <span className="font-semibold">{actionLabel(r.action)}</span>
                      {r.data != null && <span className="block max-w-md truncate text-caption text-ink-2">{JSON.stringify(r.data)}</span>}
                    </td>
                    <td className="px-5 py-2 text-caption text-ink-2">
                      {r.entity}
                      {r.entityId && <span className="block max-w-48 truncate">{r.entityId}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
