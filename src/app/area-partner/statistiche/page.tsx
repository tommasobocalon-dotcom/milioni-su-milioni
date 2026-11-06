import { Suspense } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Eye, Inbox, MapPin, Minus, MousePointerClick, Rocket, Search, Star, Wrench } from "lucide-react";
import { connection } from "next/server";
import { BoostProjection } from "@/components/partner/boost-projection";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { TrendChart } from "@/components/partner/trend-chart";
import { ButtonLink } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { requirePartner } from "@/lib/auth/session";
import { getSubscription, getTokenBalance } from "@/lib/data/partner-area";
import { canBoost } from "@/lib/domain/ranking";
import { getPartnerStats, type PartnerStats } from "@/lib/data/stats";
import { BOOST_PLACEMENTS } from "@/lib/domain/offers";
import { boostedDays, boostUplift, change, parsePeriod, STATS_PERIODS, stepRate, type StatsPeriod } from "@/lib/domain/stats";
import { LEAD_STATUSES } from "@/lib/leads/status";
import { cn } from "@/lib/utils";

export const metadata = { title: "Statistiche" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "Europe/Rome" });
const ratingFmt = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function StatsPage({ searchParams }: PageProps<"/area-partner/statistiche">) {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      {searchParams.then((sp) => (
        <Stats days={parsePeriod(sp.periodo)} />
      ))}
    </Suspense>
  );
}

async function Stats({ days }: { days: StatsPeriod }) {
  const { partner } = await requirePartner();
  await connection();
  const now = new Date();
  // Le statistiche sono incluse nei piani Normal e Premium, non nel Base (documento del 4/11/2026).
  const sub = await getSubscription(partner.id);
  if (!sub || !canBoost(sub.planWeight)) {
    return (
      <div className="flex flex-col gap-6">
        <PartnerPageHeader title="Statistiche" partnerName={partner.displayName} logoUrl={partner.logoUrl} planCode={sub?.planCode} />
        <section className="flex flex-col items-start gap-4 rounded-lg bg-brand-soft p-6 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-col gap-1">
            <h2 className="text-h3 font-semibold">Le statistiche sono incluse nei piani Normal e Premium</h2>
            <p className="text-body text-neutro-700">Visite alla scheda, richieste ricevute, da dove arrivano i clienti e quanto rende un boost.</p>
          </div>
          <ButtonLink href="/area-partner/abbonamento">Cambia piano</ButtonLink>
        </section>
      </div>
    );
  }
  const [s, tokenBalance] = await Promise.all([getPartnerStats(partner.id, now, days), getTokenBalance(partner.id, now)]);
  const t = s.totals;
  const prev = s.previousTotals;
  // Il grafico misura la ricerca: contano solo i boost "Sponsorizzato nella ricerca", non quelli della Home.
  const searchBoosts = s.boosts.filter((b) => b.placement === "search");
  const active = searchBoosts.find((b) => b.active);
  const boostMask = boostedDays(s.days, searchBoosts);
  const measuredUplift = boostUplift(s.history.views, boostedDays(s.history.days, searchBoosts));

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title="Statistiche"
        subtitle={`Come sta andando la tua scheda negli ultimi ${days} giorni`}
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
      />

      <nav aria-label="Periodo" className="flex flex-wrap items-center gap-2">
        {STATS_PERIODS.map((p) => (
          <ChipLink key={p} href={p === 30 ? "/area-partner/statistiche" : `/area-partner/statistiche?periodo=${p}`} selected={p === days} scroll={false}>
            Ultimi {p} giorni
          </ChipLink>
        ))}
      </nav>

      <section aria-label="Indicatori" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Search} label="Comparse nei risultati" value={t.impressions} previous={prev.impressions} days={days} />
        <StatTile icon={Eye} label="Visite alla scheda" value={t.views} previous={prev.views} days={days} />
        <StatTile icon={MousePointerClick} label="Clic su «Richiedi contatto»" value={t.contactClicks} previous={prev.contactClicks} days={days} />
        <StatTile icon={Inbox} label="Richieste ricevute" value={t.leads} previous={prev.leads} days={days} />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 xl:col-span-2" aria-labelledby="andamento">
          <h2 id="andamento" className="text-h3 font-semibold">
            Andamento giorno per giorno
          </h2>
          <TrendChart
            days={s.days}
            boostDays={boostMask}
            metrics={[
              { key: "views", label: "Visite", values: s.series.views },
              { key: "impressions", label: "Comparse", values: s.series.impressions },
              { key: "contactClicks", label: "Clic", values: s.series.contactClicks },
              { key: "leads", label: "Richieste", values: s.series.leads },
            ]}
          />
        </section>

        <Funnel totals={t} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <LeadOutcomes byStatus={s.leadsByStatus} total={t.leads} />
        <BarList title="Da dove arrivano" icon={MapPin} rows={s.topPlaces} empty="Nessuna richiesta nel periodo." />
        <BarList title="Lavori più richiesti" icon={Wrench} rows={s.topServices} empty="Nessuna richiesta nel periodo." />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Reviews reviews={s.reviews} days={days} />

        <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 lg:col-span-2" aria-labelledby="boost">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="boost" className="inline-flex items-center gap-2 text-h3 font-semibold">
              <Rocket className="size-5" aria-hidden /> Scheda in evidenza
            </h2>
            <ButtonLink href="/area-partner/token" size="s">
              {active ? "Allunga il periodo" : "Metti in evidenza"}
            </ButtonLink>
          </div>
          <p className="text-body-s text-ink-2">
            {active
              ? `In evidenza fino al ${dateFmt.format(active.endsAt)}: compari tra i primi risultati, etichettato come "Sponsorizzato". Nel grafico i giorni in evidenza hanno lo sfondo ambra.`
              : 'In evidenza compari tra i primi risultati della tua categoria nella tua provincia, sempre etichettato come "Sponsorizzato".'}
          </p>
          {s.boosts.length > 0 && (
            <table className="w-full text-left text-body-s">
              <thead className="text-caption text-ink-2">
                <tr>
                  <th className="py-2 font-medium">Periodo</th>
                  <th className="py-2 font-medium">Tipo</th>
                  <th className="py-2 text-right font-medium">Crediti usati</th>
                  <th className="py-2 text-right font-medium">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line tabular-nums">
                {s.boosts.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2">
                      {dateFmt.format(b.startsAt)} – {dateFmt.format(b.endsAt)}
                    </td>
                    <td className="py-2">{BOOST_PLACEMENTS[b.placement]}</td>
                    <td className="py-2 text-right">{b.tokensSpent}</td>
                    <td className="py-2 text-right">{b.active ? "Attivo" : b.upcoming ? "Programmato" : "Concluso"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <BoostProjection
        viewsPerDay={t.views / days}
        leadsPerView={t.views ? t.leads / t.views : 0}
        measuredUplift={measuredUplift}
        tokenBalance={tokenBalance}
      />

      <StatsTip s={s} />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, previous, days }: { icon: LucideIcon; label: string; value: number; previous: number; days: number }) {
  const delta = change(value, previous);
  const tone = delta == null || delta === 0 ? "text-ink-2" : delta > 0 ? "text-success" : "text-error";
  const DeltaIcon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5">
      <p className="inline-flex items-center gap-2 text-body-s text-ink-2">
        <Icon className="size-4" aria-hidden /> {label}
      </p>
      <p className="font-display text-h1">{value.toLocaleString("it-IT")}</p>
      <p className="inline-flex items-center gap-1 text-caption text-ink-2">
        {delta == null ? (
          <>Nessun dato nei {days} giorni precedenti</>
        ) : (
          <>
            <span className={cn("inline-flex items-center gap-0.5 font-semibold", tone)}>
              <DeltaIcon className="size-3.5" aria-hidden />
              {delta > 0 ? "+" : ""}
              {delta}%
            </span>
            rispetto ai {days} giorni precedenti ({previous.toLocaleString("it-IT")})
          </>
        )}
      </p>
    </div>
  );
}

/** Dalla ricerca alla richiesta: barre orizzontali sulla stessa scala, con la % che passa al passo dopo. */
function Funnel({ totals }: { totals: PartnerStats["totals"] }) {
  const steps = [
    { label: "Comparse nei risultati", value: totals.impressions },
    { label: "Visite alla scheda", value: totals.views },
    { label: "Clic su «Richiedi contatto»", value: totals.contactClicks },
    { label: "Richieste ricevute", value: totals.leads },
  ];
  const max = Math.max(1, ...steps.map((x) => x.value));
  const overall = stepRate(totals.leads, totals.views);
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6" aria-labelledby="percorso">
      <div className="flex flex-col gap-1">
        <h2 id="percorso" className="text-h3 font-semibold">
          Dalla ricerca alla richiesta
        </h2>
        <p className="text-body-s text-ink-2">
          {overall != null ? (
            <>
              <span className="font-semibold text-ink">{overall}%</span> delle visite diventa una richiesta.
            </>
          ) : (
            "Quante persone passano da un passo al successivo."
          )}
        </p>
      </div>
      <ol className="flex flex-col">
        {steps.map((step, i) => {
          const next = steps[i + 1];
          const r = next ? stepRate(next.value, step.value) : null;
          return (
            <li key={step.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-body-s">
                <span>{step.label}</span>
                <span className="font-semibold tabular-nums">{step.value.toLocaleString("it-IT")}</span>
              </div>
              <div className="h-3 rounded-r-[4px] bg-muted">
                <div className="h-full rounded-r-[4px] bg-primary" style={{ width: step.value ? `max(${(step.value / max) * 100}%, 3px)` : 0 }} />
              </div>
              {next && (
                <p className="py-2 pl-3 text-caption text-ink-2">
                  {r != null ? (
                    <>
                      ↓ <span className="font-semibold text-ink">{r}%</span> passa al passo successivo
                    </>
                  ) : step.value === 0 ? (
                    "↓ nessun dato da confrontare"
                  ) : (
                    "↓ non calcolabile: alcune richieste arrivano senza passare da questo pulsante"
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function LeadOutcomes({ byStatus, total }: { byStatus: PartnerStats["leadsByStatus"]; total: number }) {
  const won = byStatus.won ?? 0;
  const max = Math.max(1, ...LEAD_STATUSES.map((st) => byStatus[st.value] ?? 0));
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6" aria-labelledby="esiti">
      <div className="flex flex-col gap-1">
        <h2 id="esiti" className="inline-flex items-center gap-2 text-h3 font-semibold">
          <Inbox className="size-5" aria-hidden /> Esito delle richieste
        </h2>
        <p className="text-body-s text-ink-2">
          {total ? (
            <>
              <span className="font-semibold text-ink">{won}</span> acquisite su {total} ({stepRate(won, total) ?? 0}%)
            </>
          ) : (
            "Nessuna richiesta nel periodo."
          )}
        </p>
      </div>
      {total > 0 && (
        <ul className="flex flex-col gap-2.5">
          {LEAD_STATUSES.map((st) => {
            const n = byStatus[st.value] ?? 0;
            return (
              <li key={st.value} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-body-s">
                <span className="truncate">{st.label}</span>
                <span className="h-2.5 rounded-r-[4px] bg-muted">
                  <span className="block h-full rounded-r-[4px] bg-primary" style={{ width: n ? `max(${(n / max) * 100}%, 3px)` : 0 }} />
                </span>
                <span className="text-right font-semibold tabular-nums">{n}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function BarList({ title, icon: Icon, rows, empty }: { title: string; icon: LucideIcon; rows: { label: string; n: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
      <h2 className="inline-flex items-center gap-2 text-h3 font-semibold">
        <Icon className="size-5" aria-hidden /> {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-body-s text-ink-2">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.label} className="flex flex-col gap-1.5 text-body-s">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate">{r.label}</span>
                <span className="font-semibold tabular-nums">{r.n}</span>
              </span>
              <span className="h-2.5 rounded-r-[4px] bg-muted">
                <span className="block h-full rounded-r-[4px] bg-primary" style={{ width: `${(r.n / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Reviews({ reviews, days }: { reviews: PartnerStats["reviews"]; days: number }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6" aria-labelledby="recensioni">
      <h2 id="recensioni" className="inline-flex items-center gap-2 text-h3 font-semibold">
        <Star className="size-5" aria-hidden /> Recensioni del periodo
      </h2>
      {reviews.count === 0 || reviews.rating == null ? (
        <div className="flex items-center gap-3">
          <p className="text-body-s text-ink-2">
            Nessuna nuova recensione negli ultimi {days} giorni. Le recensioni arrivano solo dai clienti che ti hanno contattato dal sito.
          </p>
        </div>
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span className="font-display text-h1">{ratingFmt.format(reviews.rating)}</span>
            <span className="text-body-s text-ink-2">
              su 5 · {reviews.count} {reviews.count === 1 ? "recensione" : "recensioni"}
            </span>
          </p>
          <ul className="flex flex-col gap-3">
            {reviews.criteria.map((c) => (
              <li key={c.label} className="flex flex-col gap-1.5 text-body-s">
                <span className="flex justify-between gap-3">
                  <span>{c.label}</span>
                  <span className="font-semibold tabular-nums">{c.value != null ? ratingFmt.format(c.value) : "—"}</span>
                </span>
                <span className="h-2 rounded-full bg-salvia-100">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${((c.value ?? 0) / 5) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Un consiglio alla volta, scelto dal punto più debole del percorso (regole fisse). */
function StatsTip({ s }: { s: PartnerStats }) {
  const t = s.totals;
  const unhandled = s.leadsByStatus.new ?? 0;
  const tip =
    unhandled > 0
      ? { text: `Hai ${unhandled} ${unhandled === 1 ? "richiesta nuova" : "richieste nuove"} da gestire: chi risponde entro poche ore sale nei risultati.`, href: "/area-partner/lead?stato=new", cta: "Vedi le richieste" }
      : t.impressions < 20
        ? { text: "Compari poco nelle ricerche: metterti in evidenza ti porta tra i primi risultati della tua provincia.", href: "/area-partner/token", cta: "Metti in evidenza" }
        : (stepRate(t.views, t.impressions) ?? 100) < 15
          ? { text: "Molti ti vedono ma pochi aprono la scheda: una foto di copertina e una descrizione chiara aiutano.", href: "/area-partner/scheda", cta: "Migliora la scheda" }
          : { text: "Chi vede prezzi indicativi chiede più spesso un contatto: tieni aggiornato il listino.", href: "/area-partner/listino", cta: "Apri il listino" };
  return (
    <aside className="flex flex-col items-start gap-4 rounded-lg bg-brand-soft p-5 sm:flex-row sm:items-center">
      <p className="flex-1 text-body-s">
        <span className="font-semibold">Consiglio:</span> {tip.text}
      </p>
      <ButtonLink href={tip.href} size="s" variant="secondary">
        {tip.cta}
      </ButtonLink>
    </aside>
  );
}
