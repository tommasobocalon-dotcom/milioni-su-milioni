"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { simulateSubscription, startSubscriptionCheckout } from "@/app/area-partner/actions";
import { CheckoutButton } from "@/components/partner/checkout-button";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export type ChooserPlan = { code: string; name: string; monthlyPriceCents: number; yearlyPriceCents: number; features: string[] };

/**
 * Scelta del piano nell'Area aziende: mensile o annuale in alto, tre schede uguali, un pulsante per scheda.
 * Con Stripe il pulsante apre il Checkout; senza (sviluppo e sito di prova) attiva il piano senza pagamento.
 */
export function PlanChooser({ plans, demo, owner, trial }: { plans: ChooserPlan[]; demo: boolean; owner: boolean; trial: boolean }) {
  const [yearly, setYearly] = useState(false);
  const [pending, start] = useTransition();
  const period = yearly ? "yearly" : "monthly";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="radiogroup" aria-label="Come paghi" className="inline-flex rounded-full bg-surface p-1 ring-1 ring-line">
          {[
            { value: false, label: "Mensile" },
            { value: true, label: "Annuale · costa meno" },
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
            </button>
          ))}
        </div>
        {trial && !demo && <p className="text-body-s font-semibold text-primary">I primi 7 giorni sono gratis: oggi non paghi nulla.</p>}
      </div>

      <ul className="grid gap-5 lg:grid-cols-3">
        {plans.map((p) => {
          const featured = p.code === "normal";
          const label = `Scegli ${p.name}`;
          return (
            <li
              key={p.code}
              className={cn("relative flex flex-col gap-4 rounded-lg border bg-surface p-6", featured ? "border-2 border-primary" : "border-line")}
            >
              {featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-caption font-semibold text-on-brand">Il più scelto</span>
              )}
              <h3 className="text-h3 font-semibold">{p.name}</h3>
              <div>
                <p>
                  <span className="font-display text-display-l tabular-nums">
                    {formatEuro(yearly ? Math.round(p.yearlyPriceCents / 12) : p.monthlyPriceCents)}
                  </span>
                  <span className="text-body text-ink-2"> /mese + IVA</span>
                </p>
                <p className="text-body-s text-ink-2">
                  {yearly ? `${formatEuro(p.yearlyPriceCents)} pagati una volta all'anno` : `${formatEuro(Math.round(p.yearlyPriceCents / 12))} al mese con l'annuale`}
                </p>
              </div>
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
                    variant={featured ? "primary" : "secondary"}
                    disabled={!owner || pending}
                    onClick={() => start(() => simulateSubscription(p.code, period))}
                  >
                    {label} (prova senza pagare)
                  </Button>
                ) : (
                  <CheckoutButton
                    action={() => startSubscriptionCheckout(p.code, period)}
                    className="w-full"
                    variant={featured ? "primary" : "secondary"}
                    disabled={!owner}
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
