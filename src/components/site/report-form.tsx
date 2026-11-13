"use client";

import { useActionState } from "react";
import { reportComment } from "@/app/(pubblico)/ispirazione/comment-actions";
import { Button } from "@/components/ui/button";
import { Feedback, type FormState } from "@/components/ui/message-form";
import { REPORT_REASONS } from "@/lib/domain/comments";

/** Segnalazione di un commento: motivo da elenco e, se serve, due righe di spiegazione. */
export function ReportForm({ commentId }: { commentId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reportComment.bind(null, commentId), {});
  if (state.ok) return <Feedback state={state} />;
  return (
    <form action={action} data-keep-open className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="pb-1.5 text-body-s font-semibold">Perché lo segnali?</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r.value} className="flex items-center gap-2 text-body-s">
            <input type="radio" name="reason" value={r.value} required className="size-4 accent-primary" />
            {r.label}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1 text-body-s font-semibold">
        Vuoi aggiungere qualcosa? (facoltativo)
        <textarea name="note" rows={2} maxLength={300} className="rounded-md border border-line bg-surface px-3 py-2 text-body-s font-normal focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-primary" />
      </label>
      <p className="text-caption text-ink-2">Chi ha scritto il commento non saprà che la segnalazione è partita da te.</p>
      <Feedback state={state} />
      <Button type="submit" size="s" variant="secondary" disabled={pending} className="self-start">
        {pending ? "Invio…" : "Invia segnalazione"}
      </Button>
    </form>
  );
}
