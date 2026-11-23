import { Suspense } from "react";
import { connection } from "next/server";
import { AdminPageHeader, AdminSkeleton, dateTime, Empty, Panel } from "@/components/admin/ui";
import { ChipLink } from "@/components/ui/chip";
import { requireAdmin } from "@/lib/auth/session";
import { getProvinceDemand, listProvinceRequests } from "@/lib/data/province-requests";
import { isActiveProvince, PROVINCE_NEEDS } from "@/lib/domain/coverage";

export const metadata = { title: "Nuove province" };

const NEED = Object.fromEntries(PROVINCE_NEEDS.map((n) => [n.value, n.short]));
const TABLE_REGION = "overflow-x-auto border-t border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const TH = "px-5 py-2 font-semibold";

export default function ProvinceRequestsPage({ searchParams }: PageProps<"/admin/province">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      {searchParams.then((sp) => (
        <ProvinceRequests code={typeof sp.provincia === "string" ? sp.provincia.toUpperCase() : undefined} />
      ))}
    </Suspense>
  );
}

async function ProvinceRequests({ code }: { code?: string }) {
  await requireAdmin();
  await connection();
  const [demand, rows] = await Promise.all([getProvinceDemand(new Date()), listProvinceRequests(code)]);
  const selected = demand.find((d) => d.code === code);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Nuove province"
        subtitle="Richieste dalla mappa della Home nelle province dove il sito non è ancora attivo: conviene aprire prima dove sono di più."
      />

      <Panel title="Richieste per provincia">
        <div tabIndex={0} role="region" aria-label="Richieste per provincia" className={TABLE_REGION}>
          <table className="w-full min-w-[560px] text-left text-body-s">
            <thead className="bg-muted text-caption text-ink-2">
              <tr>
                <th scope="col" className={TH}>Provincia</th>
                <th scope="col" className={`${TH} text-right`}>Richieste</th>
                <th scope="col" className={`${TH} text-right`}>Ultimi 30 giorni</th>
                <th scope="col" className={`${TH} text-right`}>Professionisti</th>
                <th scope="col" className={`${TH} text-right`}>Agenzie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {demand.map((d) => (
                <tr key={d.code}>
                  <th scope="row" className="px-5 py-2 font-semibold">
                    {d.name}
                    {isActiveProvince(d.code) && <span className="ml-2 font-normal text-caption text-ink-2">già attiva</span>}
                  </th>
                  <td className="px-5 py-2 text-right font-semibold tabular-nums">{d.total}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{d.recent}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{d.professional}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{d.agency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={selected ? `Richieste da ${selected.name}` : "Ultime richieste"}>
        <div className="flex flex-wrap gap-2 p-5">
          <ChipLink href="/admin/province" selected={!selected}>
            Tutte
          </ChipLink>
          {demand
            .filter((d) => d.total > 0)
            .map((d) => (
              <ChipLink key={d.code} href={`/admin/province?provincia=${d.code}`} selected={selected?.code === d.code}>
                {d.name} ({d.total})
              </ChipLink>
            ))}
        </div>
        {rows.length === 0 ? (
          <Empty>Ancora nessuna richiesta.</Empty>
        ) : (
          <div tabIndex={0} role="region" aria-label="Elenco delle richieste" className={TABLE_REGION}>
            <table className="w-full min-w-[720px] text-left text-body-s">
              <thead className="bg-muted text-caption text-ink-2">
                <tr>
                  <th scope="col" className={TH}>Quando</th>
                  <th scope="col" className={TH}>Dove</th>
                  <th scope="col" className={TH}>Cerca</th>
                  <th scope="col" className={TH}>Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-2 whitespace-nowrap text-ink-2">{dateTime.format(r.createdAt)}</td>
                    <td className="px-5 py-2">
                      <span className="font-semibold">{r.provinceName}</span>
                      {r.municipality && <span className="block text-caption text-ink-2">{r.municipality}</span>}
                    </td>
                    <td className="px-5 py-2">
                      {NEED[r.need]}
                      {r.note && <span className="block max-w-md text-caption text-ink-2">{r.note}</span>}
                    </td>
                    <td className="max-w-56 truncate px-5 py-2">
                      <a href={`mailto:${r.email}`} className="text-primary underline">
                        {r.email}
                      </a>
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
