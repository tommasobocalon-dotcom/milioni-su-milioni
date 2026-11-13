"use client";

import { useActionState } from "react";
import { saveHiddenWords } from "@/app/area-partner/commenti/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Feedback, type FormState } from "@/components/ui/message-form";

/** Parole e frasi scelte dall'azienda, una per riga. */
export function HiddenWordsForm({ words }: { words: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveHiddenWords, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="parole" className="text-body-s font-semibold">
        Le tue parole o frasi
      </label>
      <Textarea id="parole" name="words" rows={5} defaultValue={words.join("\n")} aria-describedby="parole-aiuto" />
      <p id="parole-aiuto" className="text-caption text-ink-2">
        Una per riga, fino a 100. Conta la parola intera, senza badare a maiuscole e accenti.
      </p>
      <Feedback state={state} />
      <Button type="submit" size="s" disabled={pending} className="self-start">
        {pending ? "Salvo…" : "Salva l'elenco"}
      </Button>
    </form>
  );
}
