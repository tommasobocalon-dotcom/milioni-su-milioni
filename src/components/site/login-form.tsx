"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { signIn, signUp, type AuthResult } from "@/app/accedi/actions";
import { AppleIcon, GoogleIcon } from "@/components/site/provider-icons";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

const providerLink =
  "inline-flex h-11 w-full items-center justify-center gap-3 rounded-md px-5 text-body font-semibold transition-colors [&_svg]:size-5 [&_svg]:shrink-0";

export function LoginForm({ demo, notice }: { demo?: { email: string; password: string }; notice?: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<AuthResult | null>(null);
  const [pending, start] = useTransition();
  const signup = mode === "signup";

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      // Se va tutto bene l'azione fa redirect e non torna qui.
      const res = signup ? await signUp(name, email, password) : await signIn(email, password);
      if (res && !res.ok) setError(res);
    });
  }

  const fieldError = (f: NonNullable<AuthResult["field"]>) => (error?.field === f ? error.error : undefined);
  const describedBy = (id: string, f: NonNullable<AuthResult["field"]>) => (fieldError(f) ? `${id}-error` : `${id}-help`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1">{signup ? "Crea il tuo account" : "Bentornato su geco"}</h1>
        <p className="text-body text-ink-2">
          {signup
            ? "Ti serve un minuto: nome, email e una password."
            : "Clienti e aziende entrano dallo stesso posto: ti portiamo nella tua area."}
        </p>
      </div>
      {notice}
      <div role="group" aria-label="Accedi o crea un account" className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
        {(
          [
            ["login", "Accedi"],
            ["signup", "Crea account"],
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

      {/* Link normali, non <Link>: le route /auth/* rimandano al sito del provider con una navigazione completa. */}
      <div className="flex flex-col gap-3">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/auth/google" className={cn(providerLink, "border border-line bg-surface text-ink hover:bg-crema-100")}>
          <GoogleIcon /> Continua con Google
        </a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/auth/apple" className={cn(providerLink, "bg-black text-white hover:bg-neutro-900")}>
          <AppleIcon /> Continua con Apple
        </a>
      </div>

      <div className="flex items-center gap-3 text-body-s text-ink-2" role="separator" aria-label="oppure con l'email">
        <span className="h-px flex-1 bg-line" />
        oppure con l&apos;email
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
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

        {error && !error.field && (
          <p role="alert" className="rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error">
            {error.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-1">
          {pending ? (signup ? "Creazione account…" : "Accesso…") : signup ? "Crea il tuo account" : "Accedi"} <ArrowRight aria-hidden />
        </Button>
      </form>

      {demo && !signup && (
        <p className="rounded-md border border-dashed border-info bg-info-soft p-3 text-body-s text-info">
          Ambiente di prova: azienda <strong>{demo.email}</strong> con password <strong>{demo.password}</strong>. Per entrare come
          cliente crea un account con qualsiasi email.
        </p>
      )}
    </div>
  );
}
