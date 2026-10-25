"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { deletePriceItem, movePriceItem, savePriceItem, type ActionState } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { amountInput, formatPriceRange, parseAmount, PRICE_UNIT_LABEL, type PriceUnit } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export type PriceRow = {
  id: string;
  serviceId: string;
  serviceName: string;
  priceFrom: number | null;
  priceTo: number | null;
  unit: PriceUnit;
  notes: string | null;
};
export type ListableService = { id: string; name: string; defaultUnit: PriceUnit };

const UNITS = Object.entries(PRICE_UNIT_LABEL) as [PriceUnit, string][];

/** Anteprima del prezzo come compare sul profilo, calcolata mentre si scrive. */
function preview(from: string, to: string, unit: PriceUnit) {
  const f = parseAmount(from);
  const t = parseAmount(to);
  if (Number.isNaN(f) || Number.isNaN(t)) return { text: "Controlla gli importi", bad: true };
  if (f !== null && t !== null && t < f) return { text: "Il massimo è più basso del minimo", bad: true };
  return { text: formatPriceRange(f, t, unit) ?? "Su preventivo", bad: false };
}

/** Modulo di una voce: nuova (row assente) o in modifica. */
function PriceForm({ row, services, takenIds, onDone }: { row?: PriceRow; services: ListableService[]; takenIds: string[]; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePriceItem, {});
  const available = services.filter((s) => s.id === row?.serviceId || !takenIds.includes(s.id));
  const [serviceId, setServiceId] = useState(row?.serviceId ?? available[0]?.id ?? "");
  const [unit, setUnit] = useState<PriceUnit>(row?.unit ?? available[0]?.defaultUnit ?? "flat");
  const [from, setFrom] = useState(amountInput(row?.priceFrom ?? null));
  const [to, setTo] = useState(amountInput(row?.priceTo ?? null));
  const [notes, setNotes] = useState(row?.notes ?? "");
  const pv = preview(from, to, unit);
  const prefix = row ? `edit-${row.id}` : "new";
  const symbol = unit === "percent" ? "%" : "€";

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-4 rounded-md border border-primary bg-surface p-5"
      aria-label={row ? `Modifica ${row.serviceName}` : "Nuovo servizio"}
    >
      {row && <input type="hidden" name="id" value={row.id} />}
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <Field label="Servizio" htmlFor={`${prefix}-service`} required>
          <Select
            id={`${prefix}-service`}
            name="serviceId"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              // Per una voce nuova l'unità segue quella tipica del servizio scelto.
              if (!row) setUnit(services.find((s) => s.id === e.target.value)?.defaultUnit ?? unit);
            }}
            required
          >
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unità di prezzo" htmlFor={`${prefix}-unit`} required>
          <Select id={`${prefix}-unit`} name="unit" value={unit} onChange={(e) => setUnit(e.target.value as PriceUnit)} required>
            {UNITS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-[1fr_1fr_2fr]">
        {(
          [
            ["priceFrom", "Prezzo da", from, setFrom],
            ["priceTo", "Prezzo fino a", to, setTo],
          ] as const
        ).map(([name, label, value, set]) => (
          <Field key={name} label={label} htmlFor={`${prefix}-${name}`} help={name === "priceTo" ? "Vuoto se è un prezzo minimo" : "Vuoto = su preventivo"}>
            <div className="relative">
              <Input
                id={`${prefix}-${name}`}
                name={name}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={value}
                onChange={(e) => set(e.target.value)}
                className="pr-9 tabular-nums"
                aria-describedby={`${prefix}-${name}-help`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-body-s text-ink-2" aria-hidden>
                {symbol}
              </span>
            </div>
          </Field>
        ))}
        <Field label="Note per il cliente" htmlFor={`${prefix}-notes`} help={`${notes.length}/160 · ad esempio cosa è incluso`} className="sm:col-span-2 md:col-span-1">
          <Input id={`${prefix}-notes`} name="notes" maxLength={160} value={notes} onChange={(e) => setNotes(e.target.value)} aria-describedby={`${prefix}-notes-help`} />
        </Field>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-s text-ink-2" aria-live="polite">
          Sul profilo: <span className={cn("font-semibold", pv.bad ? "text-error" : "text-ink")}>{pv.text}</span>
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="s" onClick={onDone}>
            <X aria-hidden /> Annulla
          </Button>
          <Button type="submit" size="s" disabled={pending || pv.bad || !serviceId}>
            <Check aria-hidden /> {pending ? "Salvataggio…" : row ? "Salva modifiche" : "Aggiungi al listino"}
          </Button>
        </div>
      </div>
      {state.error && (
        <p className="rounded-md bg-error-soft px-4 py-3 text-body-s text-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Listino prezzi indicativi modificabile: aggiunta, modifica, ordine ed eliminazione delle voci. */
export function PriceListEditor({ rows, services, limit }: { rows: PriceRow[]; services: ListableService[]; limit: number | null }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const takenIds = rows.map((r) => r.serviceId);
  const full = limit !== null && rows.length >= limit;
  const noneLeft = services.every((s) => takenIds.includes(s.id));

  const done = (message: string) => () => {
    setEditing(null);
    setFlash(message);
  };
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <section aria-labelledby="price-list-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="price-list-title" className="text-h3 font-semibold">
          I tuoi servizi
        </h2>
        <div className="flex items-center gap-3">
          <p className="text-body-s text-success" role="status" aria-live="polite">
            {flash && (
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4" aria-hidden /> {flash}
              </span>
            )}
          </p>
          {editing !== "new" && (
            <Button size="s" onClick={() => setEditing("new")} disabled={full || noneLeft}>
              <Plus aria-hidden /> Aggiungi servizio
            </Button>
          )}
        </div>
      </div>

      {editing === "new" && <PriceForm services={services} takenIds={takenIds} onDone={done("Servizio aggiunto")} />}

      {rows.length === 0 && editing !== "new" ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface p-10 text-center">
          <Tag className="size-8 text-ink-3" aria-hidden />
          <p className="text-body font-semibold">Il listino è vuoto</p>
          <p className="max-w-sm text-body-s text-ink-2">Aggiungi i servizi che offri con una fascia di prezzo: i clienti contattano più volentieri chi mostra i prezzi.</p>
          <Button size="s" onClick={() => setEditing("new")}>
            <Plus aria-hidden /> Aggiungi il primo servizio
          </Button>
        </div>
      ) : (
        <ol className={cn("flex flex-col overflow-hidden rounded-lg border border-line bg-surface", busy && "opacity-70")}>
          {rows.map((r, i) => {
            const price = formatPriceRange(r.priceFrom, r.priceTo, r.unit);
            if (editing === r.id) {
              return (
                <li key={r.id} className="border-t border-line p-3 first:border-t-0">
                  <PriceForm row={r} services={services} takenIds={takenIds} onDone={done("Prezzo aggiornato")} />
                </li>
              );
            }
            return (
              <li
                key={r.id}
                className="group grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 border-t border-line px-4 py-4 first:border-t-0 hover:bg-page sm:px-5 md:grid-cols-[auto_1fr_auto_auto]"
              >
                <div className="flex flex-col" aria-label="Ordine">
                  <button
                    type="button"
                    aria-label={`Sposta ${r.serviceName} in su`}
                    disabled={i === 0 || busy}
                    onClick={() => startBusy(() => movePriceItem(r.id, "up"))}
                    className="rounded-sm p-1 text-ink-3 hover:bg-subtle hover:text-ink disabled:invisible"
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Sposta ${r.serviceName} in giù`}
                    disabled={i === rows.length - 1 || busy}
                    onClick={() => startBusy(() => movePriceItem(r.id, "down"))}
                    className="rounded-sm p-1 text-ink-3 hover:bg-subtle hover:text-ink disabled:invisible"
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-body font-semibold">{r.serviceName}</p>
                  <p className="flex flex-wrap items-center gap-2 text-caption text-ink-2">
                    <span className="rounded-full bg-subtle px-2 py-0.5 font-semibold text-bosco-700">{PRICE_UNIT_LABEL[r.unit]}</span>
                    {r.notes && <span className="truncate">{r.notes}</span>}
                  </p>
                </div>
                <p className={cn("col-start-2 font-display text-h4 tabular-nums md:col-start-auto md:text-right", !price && "text-ink-2")}>{price ?? "Su preventivo"}</p>
                <div className="col-start-2 flex items-center gap-1 md:col-start-auto">
                  {confirming === r.id ? (
                    <>
                      <span className="mr-1 text-body-s text-ink-2">Eliminare?</span>
                      <Button
                        variant="danger"
                        size="s"
                        disabled={busy}
                        onClick={() =>
                          startBusy(async () => {
                            await deletePriceItem(r.id);
                            setConfirming(null);
                            setFlash("Servizio eliminato");
                          })
                        }
                      >
                        Elimina
                      </Button>
                      <Button variant="ghost" size="s" onClick={() => setConfirming(null)}>
                        No
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" size="s" onClick={() => setEditing(r.id)} aria-label={`Modifica ${r.serviceName}`}>
                        <Pencil aria-hidden /> Modifica
                      </Button>
                      <Button variant="ghost" size="s" onClick={() => setConfirming(r.id)} aria-label={`Elimina ${r.serviceName}`} className="text-ink-2 hover:text-error">
                        <Trash2 aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {full && (
        <p className="text-body-s text-ink-2">
          Hai raggiunto il numero massimo di servizi del tuo piano.{" "}
          <Link href="/area-partner/abbonamento" className="font-semibold text-primary underline underline-offset-2">
            Passa a un piano superiore
          </Link>{" "}
          per aggiungerne altri.
        </p>
      )}
      {!full && noneLeft && rows.length > 0 && <p className="text-body-s text-ink-2">Hai già inserito tutti i servizi della tua categoria.</p>}
    </section>
  );
}
