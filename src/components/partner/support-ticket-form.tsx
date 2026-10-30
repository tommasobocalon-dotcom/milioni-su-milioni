"use client";

import { useActionState } from "react";
import { openSupportTicket } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Feedback } from "@/components/ui/message-form";
import { TICKET_TOPICS } from "@/lib/domain/support";

/** Nuova richiesta all'assistenza dall'Area Partner: dopo l'invio si apre la conversazione. */
export function SupportTicketForm() {
  const [state, action, pending] = useActionState(openSupportTicket, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Field label="Argomento" htmlFor="topic" required>
          <Select id="topic" name="topic" defaultValue="" required>
            <option value="" disabled>
              Scegli…
            </option>
            {TICKET_TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Oggetto" htmlFor="subject" required>
          <Input id="subject" name="subject" required minLength={3} maxLength={150} placeholder="Es. Fattura di ottobre" />
        </Field>
      </div>
      <Field label="Messaggio" htmlFor="body" required>
        <Textarea id="body" name="body" required minLength={2} rows={5} />
      </Field>
      <Feedback state={state} />
      <Button type="submit" size="s" disabled={pending} className="self-start">
        {pending ? "Invio…" : "Invia all'assistenza"}
      </Button>
    </form>
  );
}
