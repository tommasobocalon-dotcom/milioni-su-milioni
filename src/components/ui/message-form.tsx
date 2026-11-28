"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

export type FormState = { ok?: string; error?: string };
export type FormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

/** Esito di un'azione sotto al modulo: errore (alert) o conferma (status). */
export function Feedback({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="text-caption text-error">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="text-caption font-semibold text-primary">
        {state.ok}
      </p>
    );
  return null;
}

/** Un messaggio di testo (risposta, nota): il campo si svuota dopo l'invio riuscito. */
export function MessageForm({
  action,
  label,
  help,
  submit,
  variant = "primary",
  id,
}: {
  action: FormAction;
  label: string;
  help?: string;
  submit: string;
  variant?: "primary" | "secondary";
  id: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  return (
    <form
      ref={form}
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        // Invio manuale: con action={...} React svuota il testo anche quando il server risponde con un errore.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <label htmlFor={id} className="text-body-s font-semibold">
        {label}
      </label>
      <Textarea id={id} name="body" required minLength={2} rows={5} aria-describedby={help ? `${id}-help` : undefined} />
      {help && (
        <p id={`${id}-help`} className="text-caption text-ink-2">
          {help}
        </p>
      )}
      <Feedback state={state} />
      <Button type="submit" size="s" variant={variant} disabled={pending} className="self-start">
        {pending ? "Invio…" : submit}
      </Button>
    </form>
  );
}
