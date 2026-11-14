"use client";

import { useState, useTransition } from "react";
import type { CheckoutState } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export type PackageOption = {
  code: string;
  title: string;
  cents: number;
  /** Prezzo di listino, mostrato barrato quando c'è la promo. */
  listCents?: number;
  /** "5,66 € al giorno": aiuta a confrontare i pacchetti. */
  unitNote: string;
  tag?: string;
  checkout: () => Promise<CheckoutState>;
  simulate: () => Promise<void>;
};

/**
 * Scelta del pacchetto a schede (radio) con un solo pulsante d'acquisto: Stripe se configurato,
 * simulazione nell'ambiente di prova, altrimenti spento.
 */
export function PackagePicker({
  name,
  options,
  mode,
  disabled,
  renew,
}: {
  name: string;
  options: PackageOption[];
  mode: "stripe" | "simulate" | "off";
  disabled?: boolean;
  /** Già attivo: il pacchetto si somma ai giorni rimasti. */
  renew?: boolean;
}) {
  const [code, setCode] = useState(options[options.length - 1].code);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const chosen = options.find((o) => o.code === code) ?? options[0];

  function buy() {
    setError(undefined);
    start(async () => {
      if (mode === "stripe") {
        const res = await chosen.checkout();
        if (res.url) window.location.assign(res.url);
        else setError(res.error);
      } else {
        await chosen.simulate();
      }
    });
  }

  const label = pending ? (mode === "stripe" ? "Apertura di Stripe…" : "Attendi…") : `${mode === "simulate" ? "Simula" : renew ? "Prolunga" : "Attiva"} · ${formatEuro(chosen.cents)} + IVA`;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Durata</legend>
        {options.map((o) => {
          const on = o.code === code;
          return (
            <label
              key={o.code}
              className={cn(
                "relative flex cursor-pointer flex-col gap-1 rounded-md border bg-surface p-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
                on ? "border-primary ring-1 ring-primary" : "border-line hover:border-line-strong",
              )}
            >
              <input type="radio" name={name} value={o.code} checked={on} onChange={() => setCode(o.code)} className="sr-only" />
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold">{o.title}</span>
                <span
                  aria-hidden
                  className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-full border", on ? "border-primary" : "border-line-strong")}
                >
                  {on && <span className="size-2.5 rounded-full bg-primary" />}
                </span>
              </span>
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-h3 font-semibold">{formatEuro(o.cents)}</span>
                {o.listCents && o.listCents > o.cents && <s className="text-body-s text-ink-2">{formatEuro(o.listCents)}</s>}
                <span className="text-body-s text-ink-2">+ IVA</span>
              </span>
              <span className="text-body-s text-ink-2">{o.unitNote}</span>
              {o.tag && <span className="mt-1 self-start rounded-full bg-promo px-2 py-0.5 text-caption font-bold text-ink">{o.tag}</span>}
            </label>
          );
        })}
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-ink-2">Pagamento unico con carta o SEPA, nessun rinnovo automatico.</p>
        <Button type="button" onClick={buy} disabled={disabled || mode === "off" || pending} className="w-full sm:w-auto">
          {label}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-body-s text-error">
          {error}
        </p>
      )}
    </div>
  );
}
