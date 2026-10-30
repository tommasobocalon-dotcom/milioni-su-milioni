import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BadgeCheck, Coins, Euro, Flag, Inbox, LifeBuoy, Star, Store } from "lucide-react";
import { connection } from "next/server";
import { AccountStatusPill, AdminPageHeader, AdminSkeleton, ago, dateOnly, Empty, Panel, TicketStatusPill } from "@/components/admin/ui";
import { Kpi } from "@/components/partner/kpi";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminOverview } from "@/lib/data/admin";
import { formatEuro } from "@/lib/domain/format";

export const metadata = { title: "Panoramica" };

export default function AdminHomePage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const admin = await requireAdmin();
  await connection();
  const now = new Date();
  const o = await getAdminOverview(now);
  const active = o.partnersBy.active ?? 0;
  const todo = [
    { n: o.ticketsToAnswer, label: ["richiesta di assistenza da rispondere", "richieste di assistenza da rispondere"], href: "/admin/assistenza?stato=open", icon: LifeBuoy },
    { n: o.openReports, label: ["lead segnalato da decidere", "lead segnalati da decidere"], href: "/admin/segnalazioni", icon: Flag },
    { n: o.flaggedReviews, label: ["recensione segnalata", "recensioni segnalate"], href: "/admin/recensioni?stato=flagged", icon: Star },
    { n: o.toVerify, label: ["partner da verificare", "partner da verificare"], href: "/admin/partner?filtro=da-verificare", icon: BadgeCheck },
  ].filter((t) => t.n > 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`Ciao, ${admin.name.split(" ")[0]}`}
        subtitle={`${new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(now)} · dati degli ultimi 30 giorni`}
      />

      <section aria-label="Da fare" className="flex flex-col gap-3 rounded-lg bg-brand-soft p-5">
        <h2 className="text-h4 font-semibold">Da fare oggi</h2>
        {todo.length === 0 ? (
          <p className="text-body-s text-neutro-700">Tutto in ordine: nessuna richiesta in attesa.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todo.map(({ n, label, href, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="inline-flex items-center gap-2 text-body-s font-semibold text-brand hover:underline">
                  <Icon className="size-4" aria-hidden /> {n} {label[n === 1 ? 0 : 1]} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Indicatori" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Euro} label="Ricorrente mensile (MRR)" value={formatEuro(o.mrrCents)} note={`${o.activeSubscriptions} abbonamenti attivi, IVA esclusa`} />
        <Kpi
          icon={Store}
          label="Partner attivi"
          value={String(active)}
          note={`${o.partnersBy.activating ?? 0} in attivazione · ${o.partnersBy.suspended ?? 0} sospesi · ${o.newPartners} nuovi`}
        />
        <Kpi icon={Inbox} label="Lead verificati" value={String(o.leadsVerified)} note={`${o.leadsDelivered} consegnati ai partner`} />
        <Kpi icon={Coins} label="Token venduti" value={String(o.tokensSold)} note={`${o.tokensUsed} usati per lead e boost`} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel
          title="Assistenza da rispondere"
          action={
            <Link href="/admin/assistenza" className="text-body-s font-semibold text-primary hover:underline">
              Tutte
            </Link>
          }
        >
          {o.openTickets.length === 0 ? (
            <Empty>Nessuna richiesta da rispondere.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {o.openTickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/assistenza/${t.number}`} className="flex flex-col gap-1 px-5 py-3 hover:bg-subtle">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate font-semibold">
                        #{t.number} · {t.subject}
                      </span>
                      <TicketStatusPill status={t.status} />
                    </span>
                    <span className="text-caption text-ink-2">
                      {t.partnerName ?? t.requesterName} · {ago(t.lastMessageAt, now)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Ultimi partner iscritti"
          action={
            <Link href="/admin/partner" className="text-body-s font-semibold text-primary hover:underline">
              Tutti
            </Link>
          }
        >
          <ul className="divide-y divide-line">
            {o.recentPartners.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/partner/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-subtle">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{p.displayName}</span>
                    <span className="text-caption text-ink-2">
                      {p.category} · {p.municipality} · {dateOnly.format(p.createdAt)}
                    </span>
                  </span>
                  <AccountStatusPill status={p.accountStatus} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
