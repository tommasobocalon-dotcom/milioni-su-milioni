"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Feedback, type FormState } from "@/components/ui/message-form";
import { deleteAccountAction, revokeMarketingAction } from "@/app/(pubblico)/area-cliente/actions";

export function RevokeMarketingButton() {
  const [state, action, pending] = useActionState<FormState>(revokeMarketingAction, {});
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <Button type="submit" size="s" variant="secondary" disabled={pending}>
        Togli il consenso
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="delete-confirm" className="text-body-s font-semibold">
        Scrivi ELIMINA per confermare
      </label>
      <Input id="delete-confirm" name="confirm" required autoComplete="off" className="max-w-60" aria-invalid={!!state.error || undefined} />
      <Feedback state={state} />
      <Button type="submit" size="s" variant="danger" disabled={pending} className="self-start">
        {pending ? "Eliminazione…" : "Elimina il mio account"}
      </Button>
    </form>
  );
}
