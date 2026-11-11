import { formatEuro } from "@/lib/domain/format";
import type { PlanPromo } from "@/lib/domain/offers";

/** Sotto il prezzo mensile: il risparmio dell'annuale se c'è, altrimenti il totale dell'anno. */
function monthlyNote(plan: { monthlyPriceCents: number; yearlyPriceCents: number }) {
  const perMonth = Math.round(plan.yearlyPriceCents / 12);
  return perMonth < plan.monthlyPriceCents ? `${formatEuro(perMonth)} al mese con l'annuale` : `Oppure ${formatEuro(plan.yearlyPriceCents)} all'anno`;
}

export type PlanPromos = { monthly: PlanPromo | null; yearly: PlanPromo | null };

/** Prezzo di un piano nelle schede (pagina pubblica e Area aziende): con la promo, cosa si paga ora e cosa dopo. */
export function PlanPrice({
  plan,
  yearly,
}: {
  plan: { monthlyPriceCents: number; yearlyPriceCents: number; promo: PlanPromos };
  yearly: boolean;
}) {
  const promo = yearly ? plan.promo.yearly : plan.promo.monthly;
  const list = yearly ? plan.yearlyPriceCents : plan.monthlyPriceCents;
  return (
    <div>
      <p>
        <span className="font-display text-display-l tabular-nums">{formatEuro(promo?.payNowCents ?? list)}</span>
        <span className="text-body text-ink-2"> {promo && !yearly ? "il primo mese" : yearly ? "/anno" : "/mese"} + IVA</span>
      </p>
      <p className="text-body-s text-ink-2">
        {promo && !yearly && `Poi ${formatEuro(list)} al mese`}
        {promo && yearly && (
          <>
            Invece di <s>{formatEuro(list)}</s> · promo lancio
          </>
        )}
        {!promo && (yearly ? `Pari a ${formatEuro(Math.round(list / 12))} al mese` : monthlyNote(plan))}
      </p>
      {promo && promo.giftHomeDays > 0 && (
        <p className="text-body-s font-semibold text-primary">+ {promo.giftHomeDays} giorni di logo in Home in regalo</p>
      )}
    </div>
  );
}
