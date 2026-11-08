import type { Metadata } from "next";
import { BackToLogin, RequestResetForm } from "@/components/site/password-reset-forms";
import { AuthShell } from "../auth-screen";

export const metadata: Metadata = { title: "Password dimenticata", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1">Password dimenticata</h1>
        <p className="text-body text-ink-2">Scrivi l&apos;email del tuo account: ti mandiamo un link per sceglierne una nuova.</p>
      </div>
      <RequestResetForm />
      <p className="text-body-s text-ink-2">
        Te la sei ricordata? <BackToLogin />
      </p>
    </AuthShell>
  );
}
