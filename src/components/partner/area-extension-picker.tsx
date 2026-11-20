"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { simulateAreaExtension, startAreaExtensionCheckout } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/domain/format";
import { AREA_EXTENSION_OFFER, areaExtensionTotal, MAX_EXTENSION_MUNICIPALITIES } from "@/lib/domain/offers";

type Comune = { id: number; label: string };

/**
 * Estensione territoriale: l'azienda sceglie i comuni del Veneto in cui comparire in più (49 € + IVA l'uno per 30 giorni)
 * e paga tutto insieme con Stripe; nell'ambiente di prova senza Stripe l'acquisto è simulato.
 */
export function AreaExtensionPicker({ comuni, mode, disabled }: { comuni: Comune[]; mode: "stripe" | "simulate" | "off"; disabled?: boolean }) {
  const [chosen, setChosen] = useState<Comune[]>([]);
  const [text, setText] = useState("");
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [pending, start] = useTransition();

  function add() {
    const c = comuni.find((x) => x.label.toLowerCase() === text.trim().toLowerCase());
    if (!c) return setMessage({ error: "Scegli un comune dall'elenco" });
    if (chosen.length >= MAX_EXTENSION_MUNICIPALITIES) return setMessage({ error: `Al massimo ${MAX_EXTENSION_MUNICIPALITIES} comuni per pagamento` });
    if (!chosen.some((x) => x.id === c.id)) setChosen([...chosen, c]);
    setText("");
    setMessage({});
  }

  function buy() {
    const ids = chosen.map((c) => c.id);
    start(async () => {
      if (mode === "stripe") {
        const res = await startAreaExtensionCheckout(ids);
        if (res.url) window.location.assign(res.url);
        else setMessage({ error: res.error });
      } else {
        const res = await simulateAreaExtension(ids);
        setMessage(res);
        if (res.ok) setChosen([]);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="estensione-comune">
          Comune
        </label>
        <input
          id="estensione-comune"
          list="estensione-comuni"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Cerca un comune del Veneto"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-body-s focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-primary"
        />
        <datalist id="estensione-comuni">
          {comuni.map((c) => (
            <option key={c.id} value={c.label} />
          ))}
        </datalist>
        <Button type="button" size="s" variant="secondary" onClick={add}>
          Aggiungi
        </Button>
      </div>

      {chosen.length > 0 && (
        <ul aria-label="Comuni scelti" className="flex flex-wrap gap-2">
          {chosen.map((c) => (
            <li key={c.id} className="inline-flex items-center gap-1 rounded-full bg-subtle py-1 pr-1 pl-3 text-body-s">
              {c.label}
              <button
                type="button"
                onClick={() => setChosen(chosen.filter((x) => x.id !== c.id))}
                className="inline-flex size-6 items-center justify-center rounded-full hover:bg-brand-soft"
                aria-label={`Togli ${c.label}`}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-body-s">
          {chosen.length > 0 ? (
            <>
              {chosen.length} {chosen.length === 1 ? "comune" : "comuni"} · <strong>{formatEuro(areaExtensionTotal(chosen.length))}</strong> + IVA
            </>
          ) : (
            <span className="text-ink-2">
              {formatEuro(AREA_EXTENSION_OFFER.priceCents)} + IVA per comune, {AREA_EXTENSION_OFFER.days} giorni
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
