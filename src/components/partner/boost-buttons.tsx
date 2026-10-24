"use client";

import { useState, useTransition } from "react";
import { Rocket } from "lucide-react";
import { activateBoostAction, type ActionState } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";

export function BoostButtons({ options, balance }: { options: readonly { days: number; tokens: number }[]; balance: number }) {
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-3">
        {options.map((b) => (
          <li key={b.days}>
            <Button
              variant="secondary"
              disabled={pending || balance < b.tokens}
              onClick={() => {
                if (!confirm(`Attivare il boost di ${b.days} giorni per ${b.tokens} token?`)) return;
                start(async () => setState(await activateBoostAction(b.days)));
              }}
            >
              <Rocket aria-hidden /> {b.days} giorni · {b.tokens} token
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
