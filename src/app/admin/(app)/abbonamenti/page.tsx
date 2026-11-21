import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { connection } from "next/server";
import { stripeDashboardUrl } from "@/components/admin/lists";
import { AdminPageHeader, AdminSkeleton, dateOnly, Empty, Panel } from "@/components/admin/ui";
import { ChipLink } from "@/components/ui/chip";
import { requireAdmin } from "@/lib/auth/session";
import { countSubscriptionsByFilter, listSubscriptionsAdmin, SUBSCRIPTION_FILTERS, type SubscriptionFilter } from "@/lib/data/admin";
import { formatEuro } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Abbonamenti" };

const isFilter = (v: unknown): v is SubscriptionFilter => SUBSCRIPTION_FILTERS.some((f) => f.value === v);

const PILL = "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-caption font-semibold whitespace-nowrap";
const STATUS = {
  active: { label: "Attivo", style: "bg-subtle text-primary" },
  activating: { label: "Da pagare", style: "bg-info-soft text-info" },
  suspended: { label: "Pagamento non riuscito", style: "bg-error-soft text-error" },
  cancelled: { label: "Disdetto", style: "bg-muted text-ink-2" },
} as const;

export default function SubscriptionsPage({ searchParams }: PageProps<"/admin/abbonamenti">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      {searchParams.then((sp) => (
        <Subscriptions filter={isFilter(sp.filtro) ? sp.filtro : undefined} />
      ))}
    </Suspense>
  );
}

async function Subscriptions({ filter }: { filter?: SubscriptionFilter }) {
  await requireAdmin();
  await connection();
  const [counts, rows] = await Promise.all([countSubscriptionsByFilter(), listSubscriptionsAdmin(filter)]);
  const href = (f?: string) => `/admin/abbonamenti${f ? `?filtro=${f}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Abbonamenti"
        subtitle={`${counts.attivi} a pagamento · ${counts.gratuiti} ${counts.gratuiti === 1 ? "gratuito" : "gratuiti"} · ${counts.sospesi} con pagamento non riuscito · prezzi IVA esclusa`}
      />

      <Panel>
        <div className="flex flex-wrap gap-2 p-5">
          <ChipLink href={href()} selected={!filter}>
            Tutti ({counts.all})
          </ChipLink>
          {SUBSCRIPTION_FILTERS.map((f) => (
            <ChipLink key={f.value} href={href(f.value)} selected={filter === f.value}>
              {f.label} ({counts[f.value]})
            </ChipLink>
          ))}
        </div>

        {rows.length === 0 ? (
          <Empty>Nessun abbonamento.</Empty>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {rows.map((s) => (
              <li key={s.id} className="grid gap-1 px-5 py-3 text-body-s md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/admin/partner/${s.partnerId}`} className="truncate font-semibold hover:underline">
                    {s.partnerName}
                  </Link>
                  <span className="truncate text-caption text-ink-2">
                    {s.planName}
                    {!s.free && ` · ${s.period === "yearly" ? `annuale, ${formatEuro(s.yearlyPriceCents)}` : `mensile, ${formatEuro(s.monthlyPriceCents)}`}`}
                    {" · dal "}
                    {dateOnly.format(s.createdAt)}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2 text-caption text-ink-2">
                  {!s.free && s.status === "active" && <span>rinnovo il {dateOnly.format(s.currentPeriodEnd)}</span>}
                  {s.stripeSubscriptionId && (
                    <a
                      href={stripeDashboardUrl("subscriptions", s.stripeSubscriptionId)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      Stripe <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                  <span className={cn(PILL, STATUS[s.status].style)}>{s.free && s.status === "active" ? "Gratuito" : s.free && s.status === "suspended" ? "Gratuito finito" : STATUS[s.status].label}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
