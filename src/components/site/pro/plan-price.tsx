import { BadgePercent, Gift } from "lucide-react";
import { formatEuro } from "@/lib/domain/format";
import type { PlanPromo } from "@/lib/domain/offers";

/** Sotto il prezzo mensile: il risparmio dell'annuale se c'è, altrimenti il totale dell'anno. */
function monthlyNote(plan: { monthlyPriceCents: number; yearlyPriceCents: number }) {
  const perMonth = Math.round(plan.yearlyPriceCents / 12);
  return perMonth < plan.monthlyPriceCents ? `${formatEuro(perMonth)} al mese con l'annuale` : `Oppure ${formatEuro(plan.yearlyPriceCents)} all'anno`;
}

export type PlanPromos = { monthly: PlanPromo | null; yearly: PlanPromo | null };
type PromoPlan = { monthlyPriceCents: number; yearlyPriceCents: number; promo: PlanPromos };

const saving = (p: PlanPromo) => p.listCents - p.payNowCents;

/** Il risparmio più alto dell'annuale in promo tra i piani, o null se non ce n'è. */
export function bestYearlySaving(plans: PromoPlan[]): number | null {
  const savings = plans.flatMap((p) => (p.promo.yearly ? [saving(p.promo.yearly)] : []));
  return savings.length ? Math.max(...savings) : null;
}

/**
 * Fascia sopra i piani: la promo deve saltare all'occhio e spingere a scegliere (soci, 11/11/2026).
 * Solo numeri veri, presi dalle promo attive; sparisce da sola quando non ce ne sono più.
 */
export function PromoBanner({ plans }: { plans: PromoPlan[] }) {
  const firstMonth = plans.flatMap((p) => (p.promo.monthly ? [p.promo.monthly] : [])).sort((a, b) => a.payNowCents - b.payNowCents)[0];
  const yearly = bestYearlySaving(plans);
  if (!firstMonth && !yearly) return null;
  return (
    <div className="flex w-full flex-col items-start gap-3 rounded-lg bg-primary p-5 text-on-brand sm:flex-row sm:items-center sm:gap-4 md:px-6">
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rosso-600 px-3 py-1 text-caption font-bold tracking-wide text-on-brand uppercase">
        <BadgePercent className="size-4" aria-hidden /> Promo di lancio
      </span>
      <p className="text-body font-semibold">
        {firstMonth && (
          <>
            Primo mese da {formatEuro(firstMonth.payNowCents)} invece di <s className="font-normal opacity-80">{formatEuro(firstMonth.listCents)}</s>.
          </>
        )}
        {firstMonth && yearly && " "}
        {yearly && <>Con l&apos;annuale risparmi fino a {formatEuro(yearly)}.</>}
        {yearly && <span className="font-normal text-on-brand-muted"> L&apos;annuale in promo vale solo nei primi 6 mesi dal lancio.</span>}
      </p>
    </div>
  );
}

/** Prezzo di un piano nelle schede (pagina pubblica e Area aziende): con la promo, cosa si paga ora e cosa dopo. */
export function PlanPrice({ plan, yearly }: { plan: PromoPlan; yearly: boolean }) {
  const promo = yearly ? plan.promo.yearly : plan.promo.monthly;
  const list = yearly ? plan.yearlyPriceCents : plan.monthlyPriceCents;
  return (
    <div>
      {promo && (
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-rosso-600 px-3 py-1 text-caption font-bold text-on-brand">
          <BadgePercent className="size-4" aria-hidden />
          Promo · risparmi {formatEuro(saving(promo))}
        </p>
      )}
      <p className="flex flex-wrap items-baseline gap-x-2">
        {promo && <s className="text-h3 text-ink-2 tabular-nums">{formatEuro(list)}</s>}
        <span className="font-display text-display-l tabular-nums">{formatEuro(promo?.payNowCents ?? list)}</span>
        <span className="text-body text-ink-2">{promo && !yearly ? "il primo mese" : yearly ? "/anno" : "/mese"} + IVA</span>
      </p>
      <p className="text-body-s text-ink-2">
        {promo && !yearly && `Poi ${formatEuro(list)} al mese`}
        {promo && yearly && `Il primo anno, poi ${formatEuro(list)} all'anno`}
        {!promo && (yearly ? `Pari a ${formatEuro(Math.round(list / 12))} al mese` : monthlyNote(plan))}
      </p>
      {promo && promo.giftHomeDays > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-md border border-rosso-600/30 bg-rosso-100 px-3 py-2.5 text-body font-bold text-ink">
          <Gift className="size-5 shrink-0 text-rosso-600" aria-hidden />+ {promo.giftHomeDays} giorni di logo in Home in regalo
        </p>
      )}
    </div>
  );
}
