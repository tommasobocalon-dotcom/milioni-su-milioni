"use client";

import { useState, useTransition } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import { sendSupportRequest, type SupportField, type SupportResult } from "@/app/(pubblico)/assistenza/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { TICKET_TOPICS } from "@/lib/domain/support";
import { Turnstile } from "./turnstile";

type Failure = Extract<SupportResult, { ok: false }>;

/** Modulo della pagina Assistenza: crea una richiesta nel gestionale e risponde con il suo numero. */
export function SupportForm({ user }: { user: { name: string; email: string } | null }) {
  const [error, setError] = useState<Failure | null>(null);
  const [sent, setSent] = useState<{ number: number; email: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    const input = Object.fromEntries(["name", "email", "topic", "subject", "message"].map((k) => [k, String(data.get(k) ?? "")])) as Record<SupportField, string>;
    start(async () => {
      const res = await sendSupportRequest(input, turnstileToken);
      if (res.ok) setSent({ number: res.number, email: res.email });
      else {
        setError(res);
        setTurnstileReset((n) => n + 1);
      }
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-3" role="status">
        <p className="inline-flex items-center gap-2 text-h4 font-semibold text-primary">
          <CircleCheck className="size-6" aria-hidden /> Richiesta #{sent.number} inviata
        </p>
        <p className="text-body">
          Ti abbiamo mandato una conferma a <strong>{sent.email}</strong>. Ti rispondiamo per email entro un giorno lavorativo.
        </p>
        <p className="text-body-s text-ink-2">Per aggiungere dettagli rispondi a quella email: arriva dritta alla tua richiesta.</p>
      </div>
    );
  }

  const err = (f: SupportField) => (error?.field === f ? error.error : undefined);
  const aria = (f: SupportField) => ({ "aria-invalid": error?.field === f, "aria-describedby": error?.field === f ? `${f}-error` : undefined });

  return (
    <form method="post" onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome e cognome" htmlFor="name" required error={err("name")}>
          <Input id="name" name="name" autoComplete="name" required defaultValue={user?.name} {...aria("name")} />
        </Field>
        <Field label="Email" htmlFor="email" required error={err("email")} help={user ? "Quella del tuo account" : undefined}>
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={user?.email} readOnly={!!user} {...aria("email")} />
        </Field>
      </div>
      <Field label="Argomento" htmlFor="topic" required error={err("topic")}>
        <Select id="topic" name="topic" defaultValue="" required {...aria("topic")}>
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
      <Field label="Oggetto" htmlFor="subject" required error={err("subject")}>
        <Input id="subject" name="subject" required maxLength={150} placeholder="Es. Non riesco a cambiare la password" {...aria("subject")} />
      </Field>
      <Field label="Messaggio" htmlFor="message" required error={err("message")}>
        <Textarea id="message" name="message" required rows={6} {...aria("message")} />
      </Field>
      <p className="text-caption text-ink-2">Usiamo questi dati solo per risponderti. Non scrivere password o numeri di carta.</p>
      <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />
      {error && !error.field && (
        <p role="alert" className="rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error">
          {error.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Invio…" : "Invia la richiesta"} <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}
