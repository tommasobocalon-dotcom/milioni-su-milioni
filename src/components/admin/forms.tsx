"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";

import { Feedback, type FormAction, type FormState } from "@/components/ui/message-form";

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

/** Toglie un commento segnalato: motivo (parte da quello più segnalato), nota interna facoltativa e conferma. */
export function RemoveCommentForm({ action, reasons, defaultReason, consequence }: { action: FormAction; reasons: readonly { value: string; label: string }[]; defaultReason: string; consequence: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  if (state.ok) return <Feedback state={state} />;
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`Togliere il commento? Per l'autore vale come violazione: ${consequence}. Riceverà un'email con il motivo.`)) e.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <label className="flex flex-col gap-1 text-body-s font-semibold">
        Motivo scritto all&apos;autore
        <select name="reason" defaultValue={defaultReason} className="h-9 rounded-md border border-line bg-surface px-2 text-body-s font-normal">
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-body-s font-semibold">
        Nota interna (facoltativa)
        <input name="note" maxLength={500} className="h-9 rounded-md border border-line bg-surface px-2 text-body-s font-normal" />
      </label>
      <Feedback state={state} />
      <Button type="submit" size="s" variant="danger" disabled={pending} className="self-start">
        {pending ? "Tolgo…" : "Togli il commento"}
      </Button>
    </form>
  );
}

/** "Rimanda l'email" su una violazione il cui avviso all'autore non è partito. */
export function ResendStrikeEmailForm({ action }: { action: () => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState<FormState>(action, {});
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <Button type="submit" size="s" variant="secondary" disabled={pending}>
        {pending ? "Invio…" : "Rimanda l'email"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
