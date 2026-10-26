import type { Metadata } from "next";
import { Suspense } from "react";
import { NewPasswordForm } from "@/components/site/password-reset-forms";
import { ButtonLink } from "@/components/ui/button";
import { authTokenValid } from "@/lib/auth/email-links";
import { AuthShell } from "../auth-screen";

// Il token sta nell'URL: niente indicizzazione e niente Referer verso altri siti.
export const metadata: Metadata = { title: "Nuova password", robots: { index: false }, referrer: "no-referrer" };

export default function NewPasswordPage({ searchParams }: PageProps<"/accedi/nuova-password">) {
  return (
    <AuthShell>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1">Scegli una nuova password</h1>
        <p className="text-body text-ink-2">Dopo il salvataggio entri subito, e gli accessi aperti su altri dispositivi vengono chiusi.</p>
      </div>
      <Suspense fallback={null}>
        <TokenStep searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function TokenStep({ searchParams }: { searchParams: PageProps<"/accedi/nuova-password">["searchParams"] }) {
  const { token } = await searchParams;
  if (typeof token === "string" && token && (await authTokenValid(token, "password_reset"))) {
    return <NewPasswordForm token={token} />;
  }
  return (
    <div className="flex flex-col gap-4">
      <p role="alert" className="rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error">
        Questo link è scaduto o è già stato usato. I link valgono un&apos;ora e una volta sola.
      </p>
      <ButtonLink href="/accedi/password" className="self-start">
        Chiedi un nuovo link
      </ButtonLink>
    </div>
  );
}
