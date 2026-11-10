"use client";

import { useId, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { activateShowcaseAction, type ActionState } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/Rome" });

function Feedback({ state }: { state: ActionState }) {
  if (state.error)
    return (
      <p role="alert" className="text-body-s text-error">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="text-body-s text-brand">
        {state.ok}
      </p>
    );
  return null;
}

/** Provincia confinante per 30 giorni: un pulsante per provincia, con la scadenza se è già attiva. */
export function ShowcaseForm({
  items,
  options,
  balance,
}: {
  items: { id: string; title: string; activeUntil: Date | null }[];
  options: readonly { days: number; tokens: number }[];
  balance: number;
}) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  const selectId = useId();
  if (items.length === 0) {
    return <p className="rounded-md bg-subtle p-4 text-body-s">Aggiungi prima un lavoro con la foto nella tua scheda.</p>;
  }
  const chosen = items.find((i) => i.id === itemId);
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={selectId} className="text-body-s font-semibold">
        Lavoro da mettere in evidenza
      </label>
      <Select id={selectId} value={itemId} onChange={(e) => setItemId(e.target.value)} className="max-w-md">
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.title}
            {i.activeUntil ? ` (in evidenza fino al ${dateFmt.format(i.activeUntil)})` : ""}
          </option>
        ))}
      </Select>
      <div className="flex flex-wrap gap-3">
        {options.map((o) => (
          <Button
            key={o.days}
            variant="secondary"
            disabled={pending || balance < o.tokens || !chosen}
            onClick={() => {
              if (!chosen || !confirm(`Mettere "${chosen.title}" in Ispirazione per ${o.days} giorni con ${o.tokens} crediti?`)) return;
              start(async () => setState(await activateShowcaseAction(chosen.id, o.days)));
            }}
          >
            <Sparkles aria-hidden /> {o.days} giorni · {o.tokens} crediti
          </Button>
        ))}
      </div>
      <Feedback state={state} />
    </div>
  );
}
