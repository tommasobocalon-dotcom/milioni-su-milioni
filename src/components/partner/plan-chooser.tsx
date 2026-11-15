"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { simulateSubscription, startPlanChange, startSubscriptionCheckout } from "@/app/area-partner/actions";
import { CheckoutButton } from "@/components/partner/checkout-button";
import { Button } from "@/components/ui/button";
import { bestYearlySaving, PlanPrice, PromoBanner, type PlanPromos } from "@/components/site/pro/plan-price";
import { formatEuro } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export type ChooserPlan = { code: string; name: string; monthlyPriceCents: number; yearlyPriceCents: number; promo: PlanPromos; features: string[] };

/**
 * Scelta del piano nell'Area aziende: mensile o annuale in alto, tre schede uguali, un pulsante per scheda.
 * Con Stripe il pulsante apre il Checkout; senza (sviluppo e sito di prova) attiva il piano senza pagamento.
 * Con `current` serve a cambiare piano o periodo durante l'abbonamento (conferma nel portale Stripe).
 */
export function PlanChooser({
  plans,
  demo,
  owner,
  trial,
  current,
  guaranteed = false,
}: {
  plans: ChooserPlan[];
  demo: boolean;
  owner: boolean;
  trial: boolean;
  current?: { code: string; period: "monthly" | "yearly" };
  /** Partita dal piano gratuito: l'annuale in promo vale anche dopo il lancio. */
  guaranteed?: boolean;
}) {
  const [yearly, setYearly] = useState(current?.period === "yearly");
  const [pending, start] = useTransition();
  const period = yearly ? "yearly" : "monthly";
  const yearlySaving = bestYearlySaving(plans);

  return (
    <div className="flex flex-col gap-6">
      <PromoBanner plans={plans} guaranteed={guaranteed} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="radiogroup" aria-label="Come paghi" className="inline-flex rounded-full bg-surface p-1 ring-1 ring-line">
          {[
            { value: false, label: "Mensile" },
            { value: true, label: "Annuale" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={yearly === o.value}
              onClick={() => setYearly(o.value)}
              className={cn(
                "h-11 rounded-full px-5 text-body-s font-semibold transition-colors",
                yearly === o.value ? "bg-primary text-on-brand" : "text-ink-2 hover:text-ink",
              )}
            >
              {o.label}
              {o.value && yearlySaving && (
                <span className="ml-2 rounded-full bg-promo px-2 py-0.5 text-caption font-bold text-ink">-{formatEuro(yearlySaving)}</span>
              )}
            </button>
          ))}
        </div>
        {trial && !demo && <p className="text-body-s font-semibold text-primary">I primi 7 giorni sono gratis: oggi non paghi nulla.</p>}
      </div>

      <ul className="grid gap-5 lg:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = current?.code === p.code && current.period === period;
          // Nel cambio piano la scheda in evidenza è quella attuale; altrimenti il Normal consigliato.
          const featured = current ? current.code === p.code : p.code === "normal";
          const label = isCurrent ? "Il tuo piano attuale" : current ? `Passa a ${p.name}` : `Scegli ${p.name}`;
          const promo = yearly ? p.promo.yearly : p.promo.monthly;
          return (
            <li
              key={p.code}
              className={cn("relative flex flex-col gap-4 rounded-lg border bg-surface p-6", featured ? "border-2 border-primary" : "border-line")}
            >
              {featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-caption font-semibold text-on-brand">{current ? "Il tuo piano" : "Il più scelto"}</span>
              )}
              <h3 className="text-h3 font-semibold">{p.name}</h3>
              <PlanPrice plan={p} yearly={yearly} />
              <ul className="flex flex-col gap-2 text-body-s">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                {demo ? (
                  <Button
                    className="w-full"
                    variant={featured && !current ? "primary" : "secondary"}
                    disabled={!owner || pending || isCurrent}
                    onClick={() => start(() => simulateSubscription(p.code, period))}
                  >
                    {label}
                    {!current && " (prova senza pagare)"}
                  </Button>
                ) : (
                  <CheckoutButton
                    action={() => (current ? startPlanChange(p.code, period) : startSubscriptionCheckout(p.code, period))}
                    confirm={current && promo ? `Passi a ${p.name} ${yearly ? "annuale" : "mensile"} in promo: ${formatEuro(promo.payNowCents)} + IVA per il primo periodo, meno i giorni non usati del piano attuale. Se stai già pagando, l'addebito è immediato e il nuovo periodo parte oggi; se sei in prova, paghi alla fine della prova. Confermi?` : undefined}
                    className="w-full"
                    variant={featured && !current ? "primary" : "secondary"}
                    disabled={!owner || isCurrent}
                  >
                    {label}
                  </CheckoutButton>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-body-s text-ink-2">
        {demo && "Sito di prova senza pagamenti online: il piano si attiva senza addebito. "}
        Paghi in anticipo con carta o addebito SEPA, il rinnovo è automatico e disdici quando vuoi. Con la carta il piano si attiva subito, con
        l&apos;addebito SEPA alla conferma della banca.
        {!owner && " Solo il titolare dell'account può scegliere il piano."}
      </p>
    </div>
  );
}
