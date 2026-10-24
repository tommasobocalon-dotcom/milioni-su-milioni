import type { Metadata } from "next";
import Link from "next/link";
import { Geco } from "@/components/site/geco";
import { LoginForm } from "@/components/site/login-form";
import { Wordmark } from "@/components/site/wordmark";

export const metadata: Metadata = { title: "Accedi", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col gap-10 px-4 py-8 sm:px-10 lg:px-16">
        <Wordmark />
        <main id="contenuto" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-h1">Accedi a geco</h1>
            <p className="text-body text-ink-2">Clienti e aziende entrano dallo stesso posto: ti portiamo nella tua area.</p>
          </div>
          <LoginForm />
          <p className="text-body-s text-ink-2">
            Non sei ancora partner?{" "}
            <Link href="/per-i-professionisti" className="font-semibold text-primary underline">
              Scopri i piani
            </Link>
          </p>
        </main>
      </div>
      <aside className="hidden flex-col items-center justify-center gap-6 bg-brand p-16 text-center text-on-brand lg:flex">
        <Geco outfit="partner" size={260} />
        <p className="max-w-sm font-display text-h2">Le richieste dei clienti della tua zona, verificate con un SMS.</p>
        {process.env.NODE_ENV !== "production" && (
          <p className="max-w-sm text-body-s text-on-brand-muted">Ambiente di prova: azienda mario@rossiimpianti.it, cliente qualsiasi altra email</p>
        )}
      </aside>
    </div>
  );
}
