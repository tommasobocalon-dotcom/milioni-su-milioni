"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { adminSignIn } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

/** Accesso al gestionale: solo email e password, niente registrazione. Dopo l'accesso si apre /admin. */
export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminSignIn, null);
  const field = (f: "email" | "password") => (state?.field === f ? state.error : undefined);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Email" htmlFor="email" required error={field("email")}>
        {/* key: dopo un errore il modulo si azzera, l'email scritta torna al suo posto. */}
        <Input
          key={state?.email}
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          defaultValue={state?.email}
          aria-invalid={!!field("email")}
        />
      </Field>
      <Field label="Password" htmlFor="password" required error={field("password")}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!field("password")} />
      </Field>
      {state && !state.field && (
        <p role="alert" className="rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Accesso…" : "Entra nel gestionale"} <ArrowRight aria-hidden />
      </Button>
      {/* <a> e non <Link>: con ADMIN_URL il recupero password sta sul sito, a un altro indirizzo (src/lib/domain/admin-host.ts). */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/accedi/password" className="self-center text-body-s font-semibold text-primary hover:underline">
        Password dimenticata?
      </a>
    </form>
  );
}
