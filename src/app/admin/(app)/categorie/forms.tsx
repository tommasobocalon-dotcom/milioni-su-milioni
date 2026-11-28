"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Feedback, type FormState } from "@/components/ui/message-form";

/** Modulo del gestionale con esito sotto ("Salvato" o l'errore); `reset` svuota i campi dopo un inserimento riuscito. */
export function ActionForm({
  action,
  submit,
  children,
  reset,
  className = "flex flex-col gap-3",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submit: string;
  children: React.ReactNode;
  reset?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (reset && state.ok) form.current?.reset();
  }, [state, reset]);
  return (
    <form
      ref={form}
      className={className}
      onSubmit={(e) => {
        // Invio manuale: con action={...} React svuota i campi anche quando il server risponde con un errore.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {children}
      <Feedback state={state} />
      <Button type="submit" size="s" disabled={pending} className="self-start">
        {submit}
      </Button>
    </form>
  );
}

export function DeleteForm({ action, label, confirmMessage }: { action: () => Promise<FormState>; label: string; confirmMessage: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (window.confirm(confirmMessage)) startTransition(() => formAction());
      }}
    >
      <Button type="submit" size="s" variant="secondary" disabled={pending} className="self-start">
        {label}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
