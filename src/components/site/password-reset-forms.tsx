"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { requestPasswordReset, resetPassword, type AuthResult } from "@/app/accedi/actions";
import type { Audience } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useQueryParam } from "./login-form";
import { Turnstile } from "./turnstile";

/** ?per=azienda: la richiesta parte dall'accesso aziende e la nuova password riporta all'Area Partner. */
function useAudience(): Audience {
  return useQueryParam("per") === "azienda" ? "business" : "client";
}

/** "Torna all'accesso" verso la pagina da cui si è partiti. */
export function BackToLogin() {
  const audience = useAudience();
  return (
    <Link href={audience === "business" ? "/accedi/azienda" : "/accedi"} className="font-semibold text-primary underline">
      Torna all&apos;accesso
    </Link>
  );
}

/** "Password dimenticata": chiede l'email e risponde sempre allo stesso modo. */
export function RequestResetForm() {
  const audience = useAudience();
  const [error, setError] = useState<AuthResult | null>(null);
  const [sent, setSent] = useState<{ email: string; devLink?: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    // Campo non controllato: quello che si scrive prima che la pagina sia pronta non va perso.
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    start(async () => {
      const res = await requestPasswordReset(email, turnstileToken, audience);
      if (res.ok) setSent({ email, devLink: res.devLink });
      else {
        setError(res);
        setTurnstileReset((n) => n + 1);
      }
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <p className="text-body">
          Se <strong>{sent.email}</strong> è iscritta a GecoItalia, tra poco ti arriva un&apos;email con il link per scegliere una nuova password. Il
          link vale un&apos;ora.
        </p>
        <p className="text-body-s text-ink-2">Non la trovi? Guarda nella posta indesiderata, oppure riprova tra qualche minuto.</p>
        {sent.devLink && (
          <p className="rounded-md border border-dashed border-info bg-info-soft p-3 text-body-s break-all text-info">
            Ambiente di prova: l&apos;email non parte davvero.{" "}
            <a href={sent.devLink} className="font-semibold underline">
              Apri il link
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form method="post" onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Email" htmlFor="email" required error={error?.field === "email" ? error.error : undefined}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={error?.field === "email"}
          aria-describedby={error?.field === "email" ? "email-error" : undefined}
        />
      </Field>
      <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />
      {error && !error.field && (
        <p role="alert" className="rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error">
          {error.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Invio…" : "Mandami il link"} <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}

/** Nuova password dal link ricevuto per email. */
export function NewPasswordForm({ token, audience }: { token: string; audience: Audience }) {
  const [show, setShow] = useState(false);
  const [error, setError] = useState<AuthResult | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    start(async () => {
      // Se va tutto bene l'azione fa redirect nell'area personale.
      const res = await resetPassword(token, password, audience);
      if (res && !res.ok) setError(res);
    });
  }

  const fieldError = error?.field === "password" ? error.error : undefined;
  return (
    <form method="post" onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Nuova password" htmlFor="password" required error={fieldError} help="Almeno 8 caratteri. Meglio una frase che ricordi facilmente.">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            className="pr-12"
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? "password-error" : "password-help"}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Nascondi password" : "Mostra password"}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-ink-2 hover:text-ink [&_svg]:size-5"
          >
            {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </button>
        </div>
      </Field>
      {error && !error.field && (
        <p role="alert" className="rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error">
          {error.error}{" "}
          <Link href={audience === "business" ? "/accedi/password?per=azienda" : "/accedi/password"} className="font-semibold underline">
            Chiedi un nuovo link
          </Link>
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvataggio…" : "Salva e accedi"} <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}
