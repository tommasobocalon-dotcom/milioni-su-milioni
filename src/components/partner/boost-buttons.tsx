"use client";

import { useState, useTransition } from "react";
import { Rocket } from "lucide-react";
import { activateBoostAction, type ActionState } from "@/app/area-partner/actions";
import { BOOST_PLACEMENTS, boostLabel, type BoostPlacement } from "@/lib/domain/offers";
import { Button } from "@/components/ui/button";

const HINTS: Record<BoostPlacement, string> = {
  search: "Primi posti nella tua categoria e provincia; con Premium anche il riquadro grande in cima.",
  home: "Logo e nome nella fascia che scorre in Home, a rotazione con le altre aziende.",
};

export function BoostButtons({
  options,
  balance,
  initialPlacement = "search",
}: {
  options: readonly { hours: number; tokens: number }[];
  balance: number;
  initialPlacement?: BoostPlacement;
}) {
  const [placement, setPlacement] = useState<BoostPlacement>(initialPlacement);
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="grid gap-3 md:grid-cols-2">
        <legend className="mb-2 text-body-s font-semibold">Dove vuoi comparire</legend>
        {(Object.keys(BOOST_PLACEMENTS) as BoostPlacement[]).map((key) => (
          <label
            key={key}
            className="flex cursor-pointer gap-3 rounded-md border border-line p-4 has-[:checked]:border-primary has-[:checked]:bg-subtle"
          >
            <input type="radio" name="boost-placement" value={key} checked={placement === key} onChange={() => setPlacement(key)} className="mt-1 accent-primary" />
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{BOOST_PLACEMENTS[key]}</span>
              <span className="text-body-s text-ink-2">{HINTS[key]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <ul className="flex flex-wrap gap-3">
        {options.map((b) => (
          <li key={b.hours}>
            <Button
              variant="secondary"
              disabled={pending || balance < b.tokens}
              onClick={() => {
                if (!confirm(`Attivare "${BOOST_PLACEMENTS[placement]}" per ${boostLabel(b.hours)} con ${b.tokens} crediti?`)) return;
                start(async () => setState(await activateBoostAction(placement, b.hours)));
              }}
            >
              <Rocket aria-hidden /> {boostLabel(b.hours)} · {b.tokens} crediti
            </Button>
          </li>
        ))}
      </ul>
      {state.error && (
        <p role="alert" className="text-body-s text-error">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-body-s text-brand">
          {state.ok}
        </p>
      )}
    </div>
  );
}
