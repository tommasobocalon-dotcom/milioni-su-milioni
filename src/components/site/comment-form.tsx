"use client";

import { useActionState, useState } from "react";
import { postComment } from "@/app/(pubblico)/ispirazione/comment-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Feedback, type FormState } from "@/components/ui/message-form";
import { COMMENT_MAX } from "@/lib/domain/comments";

/**
 * Modulo "Scrivi un commento" sotto un lavoro. Il testo resta nel campo se l'invio viene rifiutato (link, troppo
 * lungo…), così non si riscrive da capo; si svuota solo quando il commento è partito.
 */
export function CommentForm({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(postComment.bind(null, itemId), {});
  const [text, setText] = useState("");
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setText("");
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="commento" className="text-body-s font-semibold">
        Scrivi un commento
      </label>
      <Textarea
        id="commento"
        name="body"
        required
        rows={3}
        maxLength={COMMENT_MAX}
        aria-describedby="commento-aiuto"
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        className="min-h-24"
      />
      <p id="commento-aiuto" className="flex justify-between gap-3 text-caption text-ink-2">
        <span>Fai una domanda o dai un consiglio. Niente link.</span>
        <span aria-hidden>
          {text.length} / {COMMENT_MAX}
        </span>
      </p>
      <Feedback state={state} />
      <Button type="submit" size="s" disabled={pending} className="self-start">
        {pending ? "Invio…" : "Pubblica"}
      </Button>
    </form>
  );
}
