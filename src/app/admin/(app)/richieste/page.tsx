import { Suspense } from "react";
import { Search } from "lucide-react";
import { connection } from "next/server";
import { z } from "zod";
import { LeadList } from "@/components/admin/lists";
import { AdminPageHeader, AdminSkeleton, Empty, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/session";
import { countLeadsByFilter, LEAD_FILTERS, listLeadsAdmin, type LeadFilter } from "@/lib/data/admin";

export const metadata = { title: "Richieste" };

const isFilter = (v: unknown): v is LeadFilter => LEAD_FILTERS.some((f) => f.value === v);

export default function LeadsPage({ searchParams }: PageProps<"/admin/richieste">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      {searchParams.then((sp) => (
        <Leads
          filter={isFilter(sp.filtro) ? sp.filtro : undefined}
          q={typeof sp.q === "string" ? sp.q : undefined}
          partnerId={z.uuid().safeParse(sp.partner).success ? (sp.partner as string) : undefined}
        />
      ))}
    </Suspense>
  );
}

async function Leads({ filter, q, partnerId }: { filter?: LeadFilter; q?: string; partnerId?: string }) {
  await requireAdmin();
  await connection();
  const now = new Date();
  const [counts, rows] = await Promise.all([countLeadsByFilter(partnerId), listLeadsAdmin({ q, filter, partnerId })]);
  // Filtri e ricerca restano sull'azienda scelta dalla sua scheda.
  const href = (f?: string) => {
    const params = new URLSearchParams({ ...(f && { filtro: f }), ...(partnerId && { partner: partnerId }), ...(q && { q }) }).toString();
    return `/admin/richieste${params ? `?${params}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Richieste dei clienti"
        subtitle={partnerId && rows[0] ? `Solo quelle per ${rows[0].partnerName}` : `${counts.all} in tutto, le ultime 200 in elenco`}
        back={partnerId ? { href: `/admin/partner/${partnerId}`, label: "Torna al partner" } : undefined}
      />

      <Panel>
        <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <ChipLink href={href()} selected={!filter}>
              Tutte ({counts.all})
            </ChipLink>
            {LEAD_FILTERS.map((f) => (
              <ChipLink key={f.value} href={href(f.value)} selected={filter === f.value}>
                {f.label} ({counts[f.value]})
              </ChipLink>
            ))}
          </div>
          <form role="search" className="flex gap-2" action="/admin/richieste">
            {filter && <input type="hidden" name="filtro" value={filter} />}
            {partnerId && <input type="hidden" name="partner" value={partnerId} />}
            <label htmlFor="cerca-richiesta" className="sr-only">
              Cerca per cliente, email, telefono o azienda
            </label>
            <Input id="cerca-richiesta" name="q" defaultValue={q} placeholder="Cliente, email, telefono, azienda" className="h-9 lg:w-72" />
            <Button type="submit" size="s" variant="secondary" aria-label="Cerca">
              <Search aria-hidden />
            </Button>
          </form>
        </div>
        <p className="border-t border-line px-5 py-3 text-caption text-ink-2">
          <strong className="text-ink">Codice non confermato</strong>: il cliente non ha inserito il codice arrivato per email; se sono tante, controlla l&apos;invio
          delle email. <strong className="text-ink">Non consegnata</strong>: l&apos;azienda non era attiva e al cliente abbiamo proposto alternative.{" "}
          <strong className="text-ink">Segnalata</strong>: l&apos;azienda dice che la richiesta non è valida; se la accogli non conta più tra quelle ricevute.
        </p>
        {rows.length === 0 ? (
          <Empty>Nessuna richiesta trovata.</Empty>
        ) : (
          <div className="border-t border-line">
            <LeadList leads={rows} now={now} showPartner={!partnerId} />
          </div>
        )}
      </Panel>
    </div>
  );
}
