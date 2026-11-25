"use client";

import { useState, useTransition } from "react";
import { simulateAreaExtension, startAreaExtensionCheckout } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/domain/format";
import { AREA_EXTENSION_OFFER, areaExtensionTotal } from "@/lib/domain/offers";

type Provincia = { id: number; label: string };

/**
 * Estensione territoriale: l'azienda sceglie le province del Veneto in cui comparire in più (49 € + IVA l'una per 30 giorni)
 * e paga tutto insieme con Stripe; nell'ambiente di prova senza Stripe l'acquisto è simulato.
 */
export function AreaExtensionPicker({ province, mode, disabled }: { province: Provincia[]; mode: "stripe" | "simulate" | "off"; disabled?: boolean }) {
  const [chosen, setChosen] = useState<number[]>([]);
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [pending, start] = useTransition();

  function toggle(id: number, on: boolean) {
    setChosen(on ? [...chosen, id] : chosen.filter((x) => x !== id));
    setMessage({});
  }

  function buy() {
    start(async () => {
      if (mode === "stripe") {
        const res = await startAreaExtensionCheckout(chosen);
        if (res.url) window.location.assign(res.url);
        else setMessage({ error: res.error });
      } else {
        const res = await simulateAreaExtension(chosen);
        setMessage(res);
        if (res.ok) setChosen([]);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <fieldset>
        <legend className="sr-only">Province</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {province.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5 text-body-s has-checked:border-primary has-checked:bg-subtle">
                <input
                  type="checkbox"
                  checked={chosen.includes(p.id)}
                  onChange={(e) => toggle(p.id, e.target.checked)}
                  className="size-4 accent-primary"
                />
                {p.label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <p className="text-body-s">
          {chosen.length > 0 ? (
            <>
              {chosen.length} {chosen.length === 1 ? "provincia" : "province"} · <strong>{formatEuro(areaExtensionTotal(chosen.length))}</strong> + IVA
            </>
          ) : (
            <span className="text-ink-2">
              {formatEuro(AREA_EXTENSION_OFFER.priceCents)} + IVA per provincia, {AREA_EXTENSION_OFFER.days} giorni
            </span>
          )}
        </p>
        <Button type="button" size="s" onClick={buy} disabled={disabled || mode === "off" || pending || chosen.length === 0}>
          {pending ? "Attendi…" : mode === "simulate" ? "Simula" : "Acquista"}
        </Button>
      </div>

      {message.error && (
        <p role="alert" className="text-body-s text-error">
          {message.error}
        </p>
      )}
      {message.ok && (
        <p role="status" className="text-body-s text-brand">
          {message.ok}
        </p>
      )}
    </div>
  );
}
