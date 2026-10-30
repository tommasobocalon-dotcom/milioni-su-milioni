"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Feedback, type FormAction } from "@/components/ui/message-form";

export function CreditTokensForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="credit-amount" className="text-body-s font-semibold">
            Token
          </label>
          <Input id="credit-amount" name="amount" type="number" min={1} max={1000} step={1} required inputMode="numeric" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="credit-reason" className="text-body-s font-semibold">
            Motivo
          </label>
          <Input id="credit-reason" name="reason" required minLength={3} maxLength={200} placeholder="Es. omaggio di benvenuto" />
        </div>
      </div>
      <Feedback state={state} />
      <Button type="submit" size="s" variant="secondary" disabled={pending} className="self-start">
        Accredita token
      </Button>
    </form>
  );
}

/** Sospendi o riattiva: un solo pulsante, con conferma per la sospensione. */
export function AccountStatusForm({ action, suspended }: { action: FormAction; suspended: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!suspended && !window.confirm("Sospendere il partner? La scheda sparisce dalle ricerche e i nuovi lead non vengono consegnati.")) e.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="action" value={suspended ? "reactivate" : "suspend"} />
      <Feedback state={state} />
      <Button type="submit" size="s" variant={suspended ? "primary" : "danger"} disabled={pending} className="self-start">
        {suspended ? "Riattiva il partner" : "Sospendi il partner"}
      </Button>
    </form>
  );
}
