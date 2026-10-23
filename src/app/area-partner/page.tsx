import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Clock, Coins, Inbox, Star } from "lucide-react";
import { connection } from "next/server";
import { Kpi } from "@/components/partner/kpi";
import { LeadRow } from "@/components/partner/lead-row";
import { LockedLeadsBanner } from "@/components/partner/locked-banner";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { Geco } from "@/components/site/geco";
import { ButtonLink } from "@/components/ui/button";
import { Stars } from "@/components/ui/stars";
import { requirePartner } from "@/lib/auth/session";
import { getOverview } from "@/lib/data/partner-area";
import { formatRating, formatResponseTime } from "@/lib/domain/format";
import { TOKEN_COST_PER_LEAD } from "@/lib/domain/lead-rules";

export const metadata = { title: "Panoramica" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long" });

export default function DashboardPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const { user, partner } = await requirePartner();
  await connection();
  const now = new Date();
  const o = await getOverview(partner.id, now);
  const hour = Number(new Intl.DateTimeFormat("it-IT", { hour: "numeric", hour12: false, timeZone: "Europe/Rome" }).format(now));
  const greeting = hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";
  const firstName = user.name.split(" ")[0];
  const tips = [
    o.priceCount < 6 && "completa il listino prezzi",
    "aggiungi foto prima/dopo al portfolio",
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title={`${greeting}, ${firstName}`}
        subtitle={`${new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(now)} · ${partner.displayName}`}
        partnerName={partner.displayName}
        planCode={o.sub?.planCode}
        status={o.sub ? `Attivo · rinnovo ${dateFmt.format(o.sub.currentPeriodEnd)}` : undefined}
      />

      <section className="flex flex-col gap-4 rounded-lg bg-brand-soft p-5 sm:flex-row sm:items-center">
        <Geco outfit="partner" size={72} />
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-h4 font-semibold">La tua scheda è completa al {o.completeness}%</h2>
          <p className="text-body-s text-neutro-700">
            Il geco suggerisce: {tips.join(" e ")}. Le schede più complete salgono nei risultati.
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={o.completeness} aria-valuemin={0} aria-valuemax={100} aria-label="Completezza della scheda">
            <div className="h-full rounded-full bg-primary" style={{ width: `${o.completeness}%` }} />
          </div>
        </div>
        <ButtonLink href="/area-partner/scheda" size="s">
          Completa la scheda <ArrowRight aria-hidden />
        </ButtonLink>
      </section>

      <section aria-label="Indicatori" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Inbox}
          label="Lead del periodo (quota)"
          value={o.sub ? `${o.sub.leadsUsed} / ${o.sub.leadsIncluded}` : "—"}
          note={o.sub ? `Si azzera al rinnovo del ${dateFmt.format(o.sub.currentPeriodEnd)}` : undefined}
        />
        <Kpi icon={Coins} label="Saldo token" value={String(o.balance)} note={`≈ ${Math.floor(o.balance / TOKEN_COST_PER_LEAD)} lead oltre quota`} />
        <Kpi icon={Star} label="Valutazione media" value={o.rating?.total ? formatRating(o.rating.average) : "—"} note={`${o.rating?.total ?? 0} recensioni verificate`} />
        <Kpi icon={Clock} label="Tempo medio di risposta" value={formatResponseTime(o.responseMinutes) ?? "—"} note="Tempo medio per il primo contatto" />
      </section>

      <LockedLeadsBanner leads={o.locked} now={now} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="lead-recenti" className="rounded-lg border border-line bg-surface">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 id="lead-recenti" className="text-h4 font-semibold">
              Lead recenti
            </h2>
            <span className="text-body-s text-ink-2">{o.counts.new ?? 0} nuovi</span>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {o.recent.map((l) => (
              <LeadRow key={l.id} lead={l} now={now} />
            ))}
          </ul>
          <div className="flex items-center justify-between gap-4 px-5 py-4 text-body-s">
            <span className="text-ink-2">Puoi segnalare un lead non valido entro 72 ore.</span>
            <Link href="/area-partner/lead" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              Vai alla inbox <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-lg bg-brand p-5 text-on-brand">
            <div className="flex items-start justify-between">
              <div>
                <p className="caps-label text-on-brand-muted">Saldo token</p>
                <p className="font-display text-display-l">{o.balance}</p>
              </div>
              <Geco outfit="token" size={72} />
            </div>
            <p className="text-body-s text-on-brand-muted">
              I token servono per i lead oltre quota, i boost e la vetrina &quot;In evidenza&quot;. Durano 12 mesi.
            </p>
            <ButtonLink href="/area-partner/token" variant="light" size="s">
              Acquista token
            </ButtonLink>
          </section>

          {o.lastReview && (
            <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5">
              <h2 className="text-h4 font-semibold">Ultima recensione</h2>
              <Stars value={o.lastReview.rating} size={14} />
              <p className="text-body-s">&ldquo;{o.lastReview.text}&rdquo; — {o.lastReview.authorName}</p>
              {!o.lastReview.replied && <p className="text-caption text-ink-2">Puoi rispondere pubblicamente dalla tua scheda.</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
