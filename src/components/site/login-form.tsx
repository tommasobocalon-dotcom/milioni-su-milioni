"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { signIn, signUp, type SignUpResult } from "@/app/accedi/actions";
import type { Audience } from "@/lib/auth/session";
import { GoogleIcon } from "@/components/site/provider-icons";
import { Turnstile } from "@/components/site/turnstile";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export type { Audience };

const noSubscribe = () => () => {};

/** Parametro dell'indirizzo letto nel browser: la pagina resta statica e il modulo non viene rimontato. */
export function useQueryParam(name: string) {
  return useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).get(name) ?? undefined,
    () => undefined,
  );
}

const COPY = {
  client: {
    login: { title: "Bentornato su GecoItalia", text: "Accedi per seguire le tue richieste." },
    signup: { title: "Crea il tuo account", text: "Ti serve un minuto: nome, email e una password." },
    signupTab: "Crea account",
    signupButton: "Crea il tuo account",
  },
  business: {
    login: { title: "Area aziende", text: "Entra per gestire richieste, abbonamento e sponsorizzazioni della tua attività." },
    signup: { title: "Registra la tua attività", text: "Prima il tuo account personale, poi i dati dell'attività e il piano." },
    signupTab: "Registra l'attività",
    signupButton: "Continua con i dati dell'attività",
  },
} as const;

const providerLink =
  "inline-flex h-11 w-full items-center justify-center gap-3 rounded-md px-5 text-body font-semibold transition-colors [&_svg]:size-5 [&_svg]:shrink-0";

export function LoginForm({
  audience,
  demo,
  notice,
}: {
  audience: Audience;
  demo?: { email: string; password: string };
  notice?: React.ReactNode;
}) {
  const next = useQueryParam("next");
  const signupFirst = useQueryParam("modo") === "registrati";
  const [chosen, setMode] = useState<Mode | null>(null);
  // Chi arriva dalla registrazione partner o da "Registrati" (?modo=registrati) di solito non ha ancora un account.
  const mode = chosen ?? (signupFirst || next === "/registrazione-partner" ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [error, setError] = useState<SignUpResult | null>(null);
  const [pending, start] = useTransition();
  const signup = mode === "signup";
  const copy = COPY[audience];
  // Google solo per i clienti: le aziende entrano con email e password. Apple tolto dal modulo (28/11/2026): arriverà più avanti.
  const providers = audience === "client";

  function switchMode(to: Mode) {
    setMode(to);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      // Se va tutto bene l'azione fa redirect e non torna qui.
      const res = signup ? await signUp(name, email, password, next, audience, turnstileToken, accepted) : await signIn(email, password, next, audience);
      if (res && !res.ok) {
        setError(res);
        if (signup) setTurnstileReset((n) => n + 1);
      }
    });
  }

  /** In "Crea account" anche Google crea un account: prima serve la spunta sui termini. */
  function guardProvider(e: React.MouseEvent) {
    if (!signup || accepted) return;
    e.preventDefault();
    setError({ ok: false, error: "Per creare l'account devi accettare i Termini e l'Informativa privacy", field: "terms" });
    document.getElementById("terms")?.focus();
  }

  const fieldError = (f: NonNullable<SignUpResult["field"]>) => (error?.field === f ? error.error : undefined);
  const describedBy = (id: string, f: NonNullable<SignUpResult["field"]>) => (fieldError(f) ? `${id}-error` : `${id}-help`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1">{copy[mode].title}</h1>
        <p className="text-body text-ink-2">{copy[mode].text}</p>
      </div>
      {notice}
      <div role="group" aria-label="Accedi o crea un account" className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
        {(
          [
            ["login", "Accedi"],
            ["signup", copy.signupTab],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => switchMode(value)}
            className={cn(
              "h-9 rounded-sm text-body-s font-semibold transition-colors",
              mode === value ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {providers && (
        <>
          {/* Link normali, non <Link>: le route /auth/* rimandano al sito del provider con una navigazione completa. */}
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- route handler, non una pagina */}
            <a href="/auth/google" onClick={guardProvider} className={cn(providerLink, "border border-line bg-surface text-ink hover:bg-crema-100")}>
              <GoogleIcon /> Continua con Google
            </a>
          </div>

          <div className="flex items-center gap-3 text-body-s text-ink-2" role="separator" aria-label="oppure con l'email">
            <span className="h-px flex-1 bg-line" />
            oppure con l&apos;email
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form method="post" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {signup && (
          <Field label="Nome e cognome" htmlFor="name" required error={fieldError("name")}>
            <Input
              id="name"
              autoComplete="name"
              required
              value={name}
              aria-invalid={!!fieldError("name")}
              aria-describedby={fieldError("name") ? "name-error" : undefined}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        )}
        <Field label="Email" htmlFor="email" required error={fieldError("email")}>
          <Input
            id="email"
            type="email"
            autoComplete={signup ? "email" : "username"}
            inputMode="email"
            required
            value={email}
            aria-invalid={!!fieldError("email")}
            aria-describedby={fieldError("email") ? "email-error" : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          required
          error={fieldError("password")}
          help={signup ? "Almeno 8 caratteri. Meglio una frase che ricordi facilmente." : undefined}
        >
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 8 : undefined}
              value={password}
              className="pr-12"
              aria-invalid={!!fieldError("password")}
              aria-describedby={signup || fieldError("password") ? describedBy("password", "password") : undefined}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-ink-2 hover:text-ink [&_svg]:size-5"
            >
              {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </button>
          </div>
        </Field>
        {signup && (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-start gap-3 text-body-s">
              <input
                id="terms"
                type="checkbox"
                required
                checked={accepted}
                aria-invalid={!!fieldError("terms")}
                aria-describedby={fieldError("terms") ? "terms-error" : undefined}
                onChange={(e) => {
                  setAccepted(e.target.checked);
                  if (e.target.checked && error?.field === "terms") setError(null);
                }}
                className="mt-0.5 size-5 shrink-0 accent-primary"
              />
              <span>
                Accetto i{" "}
                <Link href="/termini" target="_blank" className="font-semibold text-primary underline">
                  termini e condizioni
                </Link>{" "}
                e ho letto l&apos;
                <Link href="/privacy" target="_blank" className="font-semibold text-primary underline">
                  Informativa privacy
                </Link>
                . GecoItalia mette solo in contatto clienti e aziende e non risponde dei rapporti tra loro. *
              </span>
            </label>
            {fieldError("terms") && (
              <p id="terms-error" role="alert" className="text-body-s text-error">
                {fieldError("terms")}
              </p>
            )}
          </div>
        )}
        {/* Antispam solo sulla creazione dell'account: l'accesso ha già i suoi limiti di tentativi. */}
        {signup && <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />}
        {!signup && (
          <Link
            href={audience === "business" ? "/accedi/password?per=azienda" : "/accedi/password"}
            className="-mt-2 self-end text-body-s font-semibold text-primary underline"
          >
            Password dimenticata?
          </Link>
        )}

        {error && !error.field && (
          <p role="alert" className="rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error">
            {error.error}
            {/* Lo stesso invito per ogni errore di accesso: non rivela se l'email è iscritta. */}
            {!signup && (
              <>
                {" "}
                Non hai ancora un account?{" "}
                <button type="button" onClick={() => switchMode("signup")} className="font-semibold underline">
                  Crealo adesso
                </button>
              </>
            )}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-1">
          {pending ? (signup ? "Creazione account…" : "Accesso…") : signup ? copy.signupButton : "Accedi"} <ArrowRight aria-hidden />
        </Button>
      </form>

      {demo && !signup && (
        <p className="rounded-md border border-dashed border-info bg-info-soft p-3 text-body-s text-info">
          Ambiente di prova: azienda <strong>{demo.email}</strong> con password <strong>{demo.password}</strong>.
        </p>
      )}
    </div>
  );
}
