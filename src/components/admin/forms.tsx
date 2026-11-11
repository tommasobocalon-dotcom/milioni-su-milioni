"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";

import { Feedback, type FormAction } from "@/components/ui/message-form";

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
