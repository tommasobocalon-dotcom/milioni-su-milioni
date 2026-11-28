import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { connection } from "next/server";
import { AccountStatusPill, AdminPageHeader, AdminSkeleton, dateOnly, Empty, Panel, VerificationPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/session";
import { ACCOUNT_STATUSES, countPartnersByFilter, listPartnersAdmin, PARTNER_EXTRA_FILTERS, type PartnerFilter } from "@/lib/data/admin";

export const metadata = { title: "Partner" };

const FILTERS: { value: PartnerFilter; label: string }[] = [...ACCOUNT_STATUSES, ...PARTNER_EXTRA_FILTERS];
const isFilter = (v: unknown): v is PartnerFilter => FILTERS.some((f) => f.value === v);

export default function PartnersPage({ searchParams }: PageProps<"/admin/partner">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      {searchParams.then((sp) => (
        <Partners filter={isFilter(sp.filtro) ? sp.filtro : undefined} q={typeof sp.q === "string" ? sp.q : undefined} />
      ))}
    </Suspense>
  );
}

async function Partners({ filter, q }: { filter?: PartnerFilter; q?: string }) {
  await requireAdmin();
  await connection();
  const [counts, rows] = await Promise.all([countPartnersByFilter(), listPartnersAdmin({ q, filter })]);
  const href = (f?: string) => `/admin/partner${f ? `?filtro=${f}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Partner" subtitle={`${counts.all} aziende iscritte · ${counts.active} attive`} />

      <Panel>
        <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <ChipLink href={href()} selected={!filter}>
              Tutti ({counts.all})
            </ChipLink>
            {FILTERS.map((f) => (
              <ChipLink key={f.value} href={href(f.value)} selected={filter === f.value}>
                {f.label} ({counts[f.value]})
              </ChipLink>
            ))}
          </div>
          <form role="search" className="flex gap-2" action="/admin/partner">
            {filter && <input type="hidden" name="filtro" value={filter} />}
            <label htmlFor="cerca-partner" className="sr-only">
              Cerca per nome, ragione sociale, partita IVA o email
            </label>
            <Input id="cerca-partner" name="q" defaultValue={q} placeholder="Nome, P.IVA o email" className="h-9 lg:w-72" />
            <Button type="submit" size="s" variant="secondary" aria-label="Cerca">
              <Search aria-hidden />
            </Button>
          </form>
        </div>

        {rows.length === 0 ? (
          <Empty>Nessun partner trovato.</Empty>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {rows.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/partner/${p.id}`} className="grid gap-1 px-5 py-3 hover:bg-subtle md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-semibold">{p.displayName}</span>
                    <span className="truncate text-caption text-ink-2">
                      {p.businessName} · P.IVA {p.vatNumber} · {p.category} · {p.municipality}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-caption text-ink-2">
                    <span>{p.plan ?? "Nessun piano"}</span>
                    <span>dal {dateOnly.format(p.createdAt)}</span>
                    <VerificationPill status={p.verificationStatus} />
                    <AccountStatusPill status={p.accountStatus} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
