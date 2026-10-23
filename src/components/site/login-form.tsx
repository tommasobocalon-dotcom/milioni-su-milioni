"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { requestLoginCode, verifyLoginCode } from "@/app/accedi/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await requestLoginCode(email);
      if (!res.ok) return setError(res.error);
      setSentTo(res.email);
      setDevCode(res.devCode);
    });
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setError(null);
    start(async () => {
      const res = await verifyLoginCode(sentTo, code);
      if (res && !res.ok) setError(res.error);
    });
  }

  return sentTo ? (
    <form onSubmit={verify} className="flex flex-col gap-4">
      <p className="text-body">
        Se <strong>{sentTo}</strong> è registrato, ti abbiamo inviato un codice di 6 cifre. Controlla anche lo spam.
      </p>
      {devCode && (
        <p className="rounded-md border border-dashed border-info bg-info-soft p-3 text-body-s text-info">
          Ambiente di prova: le email non partono davvero. Il codice è <strong className="tracking-widest">{devCode}</strong>.
        </p>
      )}
      <Field label="Codice di accesso" htmlFor="code" required>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="text-center text-h3 tracking-[0.4em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </Field>
      {error && (
        <p role="alert" className="text-body-s text-error">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending || code.length !== 6}>
        {pending ? "Accesso…" : "Accedi"} <ArrowRight aria-hidden />
      </Button>
      <button type="button" className="text-body-s font-semibold text-primary underline" onClick={() => setSentTo(null)}>
        Usa un altro indirizzo
      </button>
    </form>
  ) : (
    <form onSubmit={send} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email" required help="Ti mandiamo un codice: niente password da ricordare">
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {error && (
        <p role="alert" className="text-body-s text-error">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        <Mail aria-hidden /> {pending ? "Invio…" : "Inviami il codice"}
      </Button>
    </form>
  );
}
