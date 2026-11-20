import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BadgeCheck, CircleAlert, Euro, Flag, Inbox, LifeBuoy, MailWarning, Phone, Rocket, Store } from "lucide-react";
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
  const active = o.partnersBy.active;
  const todo = [
    { n: o.ticketsToAnswer, label: ["richiesta di assistenza da rispondere", "richieste di assistenza da rispondere"], href: "/admin/assistenza?stato=open", icon: LifeBuoy },
    { n: o.openReports, label: ["lead segnalato da decidere", "lead segnalati da decidere"], href: "/admin/segnalazioni", icon: Flag },
    { n: o.partnersBy.suspended, label: ["azienda sospesa (pagamento non riuscito o a mano)", "aziende sospese (pagamento non riuscito o a mano)"], href: "/admin/partner?filtro=suspended", icon: CircleAlert },
    { n: o.leadsNotDelivered, label: ["richiesta non consegnata negli ultimi 7 giorni: l'azienda non era attiva", "richieste non consegnate negli ultimi 7 giorni: le aziende non erano attive"], href: "/admin/richieste?filtro=non-consegnate", icon: Inbox },
    { n: o.stuckActivating, label: ["azienda iscritta da più di 3 giorni senza piano: da richiamare", "aziende iscritte da più di 3 giorni senza piano: da richiamare"], href: "/admin/partner?filtro=activating", icon: Phone },
    { n: o.toVerify, label: ["partner da verificare", "partner da verificare"], href: "/admin/partner?filtro=da-verificare", icon: BadgeCheck },
    { n: o.freeAtLimit, label: ["azienda gratuita ha finito le richieste del mese: proponi un piano", "aziende gratuite hanno finito le richieste del mese: proponi un piano"], href: "/admin/abbonamenti?filtro=gratuiti", icon: Euro },
    { n: o.sponsorshipsEnding, label: ["sponsorizzazione finisce entro 3 giorni", "sponsorizzazioni finiscono entro 3 giorni"], href: "/admin/sponsorizzazioni", icon: Rocket },
    { n: o.leadsUnconfirmed, label: ["richiesta con codice mai confermato (7 giorni): se crescono, controlla le email", "richieste con codice mai confermato (7 giorni): se crescono, controlla le email"], href: "/admin/richieste?filtro=da-confermare", icon: MailWarning },
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
        <Kpi icon={Euro} label="Ricorrente mensile (MRR)" value={formatEuro(o.mrrCents)} note={`${o.activeSubscriptions} a pagamento · ${o.freeSubscriptions} ${o.freeSubscriptions === 1 ? "gratuito" : "gratuiti"} · IVA esclusa`} />
        <Kpi
          icon={Store}
          label="Partner attivi"
          value={String(active)}
          note={`${o.partnersBy.activating} in attivazione · ${o.partnersBy.suspended} sospesi · ${o.newPartners} nuovi in 30 giorni`}
        />
        <Kpi
          icon={Inbox}
          label="Richieste confermate"
          value={String(o.leadsVerified)}
          note={`${o.leadsDelivered} consegnate · ${o.leadsLocked} senza contatti · ${o.leadsCreated} iniziate`}
        />
        <Kpi
          icon={Rocket}
          label="Sponsorizzazioni attive"
          value={String(o.homeSponsors + o.searchBoosts + o.areaExtensions)}
          note={`${o.homeSponsors} logo in Home · ${o.searchBoosts} boost · ${o.areaExtensions} comuni in più`}
        />
      </section>

      <Panel title="Aziende attive">
        <div className="grid gap-6 p-5 md:grid-cols-3">
          {[
            { title: "Per piano", rows: o.byPlan },
            { title: "Per provincia", rows: o.byProvince },
            { title: "Categorie con più aziende", rows: o.byCategory },
          ].map((b) => (
            <div key={b.title} className="flex flex-col gap-2">
              <h3 className="text-body-s font-semibold">{b.title}</h3>
              {b.rows.length === 0 ? (
                <p className="text-caption text-ink-2">Ancora nessuna.</p>
              ) : (
                <dl className="flex flex-col divide-y divide-line text-body-s">
                  {b.rows.map((r) => (
                    <div key={r.name} className="flex justify-between gap-3 py-1.5">
                      <dt className="truncate text-ink-2">{r.name}</dt>
                      <dd className="font-semibold tabular-nums">{r.n}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ))}
        </div>
      </Panel>

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
