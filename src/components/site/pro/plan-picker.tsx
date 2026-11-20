"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { bestYearlySaving, PlanPrice, PromoBanner, type PlanPromos } from "@/components/site/pro/plan-price";
import { formatEuro } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export type PlanCard = {
  code: string;
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  promo: PlanPromos;
  lines: string[];
};

/** I tre piani affiancati, con la scelta mensile/annuale. Il piano Normal è quello consigliato. */
export function PlanPicker({ plans }: { plans: PlanCard[] }) {
  const [yearly, setYearly] = useState(false);
  const yearlySaving = bestYearlySaving(plans);

  return (
    <div className="flex flex-col items-center gap-8">
      <PromoBanner plans={plans} />
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

      <ul className="grid w-full gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const featured = p.code === "normal";
          return (
            <li
              key={p.code}
              className={cn(
                "relative flex flex-col gap-5 rounded-lg border bg-surface p-6",
                featured ? "border-2 border-primary" : "border-line",
              )}
            >
              {featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-caption font-semibold text-on-brand">
                  Consigliato
                </span>
              )}
              <h3 className="text-h3 font-semibold">{p.name}</h3>
              <PlanPrice plan={p} yearly={yearly} />
              <ul className="flex flex-col gap-2.5 text-body-s">
                {p.lines.map((l) => (
                  <li key={l} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {l}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-2">
                <ButtonLink href="/registrazione-partner" variant={featured ? "primary" : "secondary"} className="w-full">
                  Scegli {p.name}
                </ButtonLink>
                <p className="text-center text-caption text-ink-2">
                  7 giorni gratis, poi {formatEuro((yearly ? p.promo.yearly : p.promo.monthly)?.payNowCents ?? (yearly ? p.yearlyPriceCents : p.monthlyPriceCents))}
                  {yearly ? " per l'anno" : (p.promo.monthly ? " il primo mese" : " al mese")}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
