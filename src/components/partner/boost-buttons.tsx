"use client";

import { useState, useTransition } from "react";
import { Rocket } from "lucide-react";
import { activateBoostAction, type ActionState } from "@/app/area-partner/actions";
import { boostLabel } from "@/lib/domain/offers";
import { Button } from "@/components/ui/button";

export function BoostButtons({ options, balance }: { options: readonly { hours: number; tokens: number }[]; balance: number }) {
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-3">
        {options.map((b) => (
          <li key={b.hours}>
            <Button
              variant="secondary"
              disabled={pending || balance < b.tokens}
              onClick={() => {
                if (!confirm(`Attivare il boost per ${boostLabel(b.hours)} con ${b.tokens} crediti?`)) return;
                start(async () => setState(await activateBoostAction(b.hours)));
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
