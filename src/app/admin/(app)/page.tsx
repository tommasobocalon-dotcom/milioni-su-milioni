import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CircleAlert,
  CircleCheck,
  Euro,
  Flag,
  Inbox,
  LifeBuoy,
  MailWarning,
  Minus,
  Phone,
  Rocket,
  Store,
  type LucideIcon,
} from "lucide-react";
import { connection } from "next/server";
import { AccountStatusPill, AdminPageHeader, AdminSkeleton, ago, Panel, TicketStatusPill } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminOverview } from "@/lib/data/admin";
import { formatEuro } from "@/lib/domain/format";

export const metadata = { title: "Panoramica" };

/**
 * Panoramica del gestionale per aree (cliente, 20/11/2026): in cima le cose da fare, poi Soldi, Aziende,
 * Clienti e Assistenza con un numero principale, il confronto con i 30 giorni prima e il link alla sezione.
 */
export default function AdminHomePage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Overview />
    </Suspense>
  );
}

const shortDay = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });

async function Overview() {
  const admin = await requireAdmin();
  await connection();
  const now = new Date();
  const o = await getAdminOverview(now);
  const sponsorships = o.homeSponsors + o.searchBoosts + o.areaExtensions;
  const todo: { n: number; label: string; href: string; icon: LucideIcon; urgent?: boolean }[] = [
    { n: o.ticketsToAnswer, label: "Assistenza da rispondere", href: "/admin/assistenza?stato=open", icon: LifeBuoy, urgent: true },
    { n: o.openReports, label: "Lead segnalati da decidere", href: "/admin/segnalazioni", icon: Flag, urgent: true },
    { n: o.toVerify, label: "Aziende da verificare (scheda nascosta)", href: "/admin/partner?filtro=da-verificare", icon: BadgeCheck, urgent: true },
    { n: o.partnersBy.suspended, label: "Aziende sospese", href: "/admin/partner?filtro=suspended", icon: CircleAlert, urgent: true },
    { n: o.leadsNotDelivered, label: "Richieste non consegnate (7 giorni)", href: "/admin/richieste?filtro=non-consegnate", icon: Inbox, urgent: true },
    { n: o.stuckActivating, label: "Iscritte da 3 giorni senza piano: da richiamare", href: "/admin/partner?filtro=activating", icon: Phone },
    { n: o.freeAtLimit, label: "Gratuite senza richieste per il mese: proponi un piano", href: "/admin/abbonamenti?filtro=gratuiti", icon: Euro },
    { n: o.sponsorshipsEnding, label: "Sponsorizzazioni che finiscono entro 3 giorni", href: "/admin/sponsorizzazioni", icon: Rocket },
    { n: o.leadsUnconfirmed, label: "Codici mai confermati (7 giorni): controlla le email", href: "/admin/richieste?filtro=da-confermare", icon: MailWarning },
  ].filter((t) => t.n > 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`Ciao, ${admin.name.split(" ")[0]}`}
        subtitle={new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(now)}
      />

      <section aria-labelledby="da-fare" className="flex flex-col rounded-lg border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="da-fare" className="text-h4 font-semibold">
            Da fare
          </h2>
          {todo.length > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-caption font-semibold text-on-brand tabular-nums">{todo.reduce((s, t) => s + t.n, 0)}</span>
          )}
        </div>
        {todo.length === 0 ? (
          <p className="flex items-center gap-2 px-5 py-4 text-body-s text-ink-2">
            <CircleCheck className="size-5 text-success" aria-hidden /> Tutto in ordine: niente in sospeso.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {todo.map(({ n, label, href, icon: Icon, urgent }) => (
              <li key={href}>
                <Link href={href} className="group flex items-center gap-3 px-5 py-3 hover:bg-subtle">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${urgent ? "bg-error-soft text-error" : "bg-subtle text-primary"}`}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-body-s">{label}</span>
                  <span className="font-display text-h4 font-semibold tabular-nums">{n}</span>
                  <ArrowRight className="size-4 shrink-0 text-ink-2 group-hover:text-primary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Area icon={Euro} title="Soldi" href="/admin/abbonamenti" linkLabel="Abbonamenti">
          <Hero value={formatEuro(o.mrrCents)} label="al mese dagli abbonamenti (IVA esclusa)" />
          <div className="flex flex-col gap-2">
            <h3 className="text-caption font-semibold text-ink-2">Al mese per piano</h3>
            <Bars rows={o.mrrByPlan.map((r) => ({ name: r.plan, n: r.cents }))} format={formatEuro} />
          </div>
          <Rows
            rows={[
              ["Abbonamenti a pagamento", o.activeSubscriptions],
              ["Piani gratuiti di lancio", o.freeSubscriptions],
              ["Sponsorizzazioni attive", sponsorships, `${o.homeSponsors} logo in Home · ${o.searchBoosts} boost · ${o.areaExtensions} comuni in più`],
            ]}
          />
        </Area>

        <Area icon={Store} title="Aziende" href="/admin/partner" linkLabel="Aziende">
          <Hero value={String(o.partnersBy.active)} label="online" />
          <Delta now={o.newPartners} before={o.newPartnersPrev} what="iscritte negli ultimi 30 giorni" />
          <PlanBars rows={o.byPlan} />
          <Rows
            rows={[
              ["Da verificare", o.toVerify],
              ["In attivazione", o.partnersBy.activating],
              ["Sospese", o.partnersBy.suspended],
            ]}
          />
          {o.recentPartners.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="text-caption font-semibold text-ink-2">Ultime iscritte</h3>
              <ul className="flex flex-col">
                {o.recentPartners.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/partner/${p.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-subtle">
                      <span className="min-w-0 truncate text-body-s">
                        <span className="font-semibold">{p.displayName}</span> <span className="text-ink-2">· {p.category}</span>
                      </span>
                      <AccountStatusPill status={p.accountStatus} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Area>

        <Area icon={Inbox} title="Clienti" href="/admin/richieste" linkLabel="Richieste">
          <Hero value={String(o.leadsVerified)} label="richieste confermate negli ultimi 30 giorni" />
          <Delta now={o.leadsVerified} before={o.leadsVerifiedPrev} what="rispetto ai 30 giorni prima" plain />
          <DailyBars days={o.leadsDaily} />
          <Rows
            rows={[
              ["Consegnate alle aziende", o.leadsDelivered],
              ["Senza contatti (gratuiti al limite)", o.leadsLocked],
              ["Iniziate, anche senza codice", o.leadsCreated],
            ]}
          />
        </Area>

        <Area icon={LifeBuoy} title="Assistenza" href="/admin/assistenza" linkLabel="Assistenza">
          <Hero value={String(o.ticketsToAnswer)} label={o.ticketsToAnswer === 1 ? "richiesta da rispondere" : "richieste da rispondere"} />
          {o.openTickets.length > 0 && (
            <ul className="flex flex-col">
              {o.openTickets.slice(0, 4).map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/assistenza/${t.number}`} className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-subtle">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-body-s font-semibold">
                        #{t.number} · {t.subject}
                      </span>
                      <span className="text-caption text-ink-2">
                        {t.partnerName ?? t.requesterName} · {ago(t.lastMessageAt, now)}
                      </span>
                    </span>
                    <TicketStatusPill status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Rows rows={[["Lead segnalati da decidere", o.openReports]]} />
        </Area>
      </div>

      <Panel title="Dove sono le aziende online">
        <div className="grid gap-6 p-5 md:grid-cols-2">
          {[
            { title: "Per provincia", rows: o.byProvince },
            { title: "Categorie con più aziende", rows: o.byCategory },
          ].map((b) => (
            <div key={b.title} className="flex flex-col gap-2">
              <h3 className="text-body-s font-semibold">{b.title}</h3>
              {b.rows.length === 0 ? <p className="text-caption text-ink-2">Ancora nessuna.</p> : <Bars rows={b.rows} />}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Area({ icon: Icon, title, href, linkLabel, children }: { icon: LucideIcon; title: string; href: string; linkLabel: string; children: React.ReactNode }) {
  const id = `area-${title.toLowerCase()}`;
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-4 rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="inline-flex items-center gap-2 text-h4 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-subtle text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          {title}
        </h2>
        <Link href={href} className="inline-flex items-center gap-1 text-body-s font-semibold text-primary hover:underline">
          {linkLabel} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Hero({ value, label }: { value: string; label: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-display text-display-l tabular-nums">{value}</span>
      <span className="text-body-s text-ink-2">{label}</span>
    </p>
  );
}

/** Confronto con i 30 giorni prima: con `plain` solo la differenza, altrimenti anche il numero di adesso. */
function Delta({ now, before, what, plain }: { now: number; before: number; what: string; plain?: boolean }) {
  const diff = now - before;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const change = `${diff > 0 ? "+" : "−"}${Math.abs(diff)}`;
  const text = plain
    ? diff === 0
      ? `Come nei 30 giorni prima (${before})`
      : `${change} ${what} (${before})`
    : `${now} ${what} · ${diff === 0 ? "come" : change} rispetto ai 30 giorni prima`;
  return (
    <p className="-mt-2 inline-flex items-center gap-1.5 text-body-s text-ink-2">
      <Icon className={`size-4 ${diff > 0 ? "text-success" : diff < 0 ? "text-error" : ""}`} aria-hidden />
      {text}
    </p>
  );
}

function Rows({ rows }: { rows: [label: string, n: number, note?: string][] }) {
  return (
    <dl className="flex flex-col divide-y divide-line border-t border-line text-body-s">
      {rows.map(([label, n, note]) => (
        <div key={label} className="flex items-baseline justify-between gap-3 py-2">
          <dt className="min-w-0">
            {label}
            {note && <span className="block text-caption text-ink-2">{note}</span>}
          </dt>
          <dd className="font-semibold tabular-nums">{n}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Barre orizzontali con etichetta e numero: il testo resta in inchiostro, la barra porta solo la grandezza. */
function Bars({ rows, format = String }: { rows: { name: string; n: number }[]; format?: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r.n), 1);
  return (
    <ul className="flex flex-col gap-2 text-body-s">
      {rows.map((r) => (
        <li key={r.name} className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3">
          <span className="truncate text-ink-2">{r.name}</span>
          <span className="h-2 rounded-full bg-muted" aria-hidden>
            <span className="block h-full rounded-full bg-primary" style={{ width: `${(r.n / max) * 100}%` }} />
          </span>
          <span className="min-w-8 text-right font-semibold tabular-nums">{format(r.n)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Aziende online per piano, sempre nello stesso ordine (il gratuito solo se c'è). */
function PlanBars({ rows }: { rows: { name: string; n: number }[] }) {
  const sorted = ["Premium", "Normal", "Base", "Gratuito"]
    .map((name) => ({ name, n: rows.find((r) => r.name === name)?.n ?? 0 }))
    .filter((r) => r.n > 0 || r.name !== "Gratuito");
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-caption font-semibold text-ink-2">Online per piano</h3>
      <Bars rows={sorted} />
    </div>
  );
}

/** Richieste confermate al giorno: una barra per giorno, numero al passaggio del mouse, tabella per i lettori di schermo. */
function DailyBars({ days }: { days: { day: string; n: number }[] }) {
  const max = Math.max(...days.map((d) => d.n), 1);
  const label = (d: string) => shortDay.format(new Date(`${d}T00:00:00Z`));
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="text-caption font-semibold text-ink-2">Richieste confermate al giorno</figcaption>
      <div className="flex h-24 items-end gap-[2px]" aria-hidden>
        {days.map((d) => (
          <div key={d.day} title={`${label(d.day)}: ${d.n}`} className="group flex h-full flex-1 items-end">
            <div
              className={`w-full rounded-t-[4px] ${d.n > 0 ? "bg-primary group-hover:bg-bosco-600" : "bg-line"}`}
              style={{ height: d.n > 0 ? `${Math.max((d.n / max) * 100, 6)}%` : "2px" }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-caption text-ink-2" aria-hidden>
        <span>{label(days[0].day)}</span>
        <span>oggi</span>
      </div>
      <table className="sr-only">
        <caption>Richieste confermate negli ultimi 30 giorni</caption>
        <thead>
          <tr>
            <th scope="col">Giorno</th>
            <th scope="col">Richieste</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <td>{label(d.day)}</td>
              <td>{d.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
