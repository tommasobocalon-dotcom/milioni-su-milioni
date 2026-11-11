import { redirect } from "next/navigation";
import { Suspense } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminLoginForm } from "@/components/admin/login-form";
import { Button } from "@/components/ui/button";
import { getAnySessionUser, userIsAdmin } from "@/lib/auth/session";

export const metadata = { title: "Accedi" };

/** Accesso al gestionale, con la grafica dell'app e non quella del sito. */
export default function AdminLoginPage() {
  return (
    <main id="contenuto" className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <p aria-hidden className="font-wordmark text-3xl font-extrabold tracking-[-0.01em] text-brand">GECOITALIA</p>
          <h1 className="font-display text-h2">Gestionale GecoItalia</h1>
          <p className="text-body-s text-ink-2">Riservato al team: assistenza, partner e segnalazioni.</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-6">
          <Suspense fallback={<AdminLoginForm />}>
            <CurrentSession />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

/** Chi è già dentro come amministratore va al gestionale; chi è dentro con un altro account può cambiarlo. */
async function CurrentSession() {
  const user = await getAnySessionUser();
  if (!user) return <AdminLoginForm />;
  if (await userIsAdmin(user.id)) redirect("/admin");
  return (
    <form action={logoutAdmin} className="flex flex-col gap-4">
      <p className="text-body-s">
        Sei entrato come <strong>{user.name}</strong> ({user.email}): questo account non ha accesso al gestionale.
      </p>
      <Button type="submit" variant="secondary">
        Esci e cambia account
      </Button>
    </form>
  );
}
