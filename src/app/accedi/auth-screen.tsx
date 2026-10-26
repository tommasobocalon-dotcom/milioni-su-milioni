import Link from "next/link";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { Geco } from "@/components/site/geco";
import { LoginForm, type Audience } from "@/components/site/login-form";
import { Wordmark } from "@/components/site/wordmark";
import { DEMO_ACCOUNT } from "@/lib/auth/demo";
import { demoMode } from "@/lib/demo-mode";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PROVIDER = { google: "Google", apple: "Apple" } as const;

/** Messaggi per il ritorno da Google/Apple (?errore=<provider>-<motivo>). */
function oauthMessage(code: string | undefined): string | null {
  const match = code?.match(/^(google|apple)-(config|denied|state|token|email)$/);
  if (!match) return null;
  const name = PROVIDER[match[1] as keyof typeof PROVIDER];
  switch (match[2]) {
    case "config":
      return `L'accesso con ${name} non è ancora attivo. Usa email e password.`;
    case "denied":
      return `Accesso con ${name} annullato.`;
    case "email":
      return `${name} non ci ha dato un'email verificata: usa email e password.`;
    default:
      return `Non siamo riusciti a completare l'accesso con ${name}. Riprova.`;
  }
}

async function OAuthNotice({ searchParams }: { searchParams: SearchParams }) {
  const { errore } = await searchParams;
  const message = oauthMessage(typeof errore === "string" ? errore : undefined);
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error">
      {message}
    </p>
  );
}

/** Cosa cambia tra l'accesso dei clienti (/accedi) e quello delle aziende (/accedi/azienda). */
const SCREEN = {
  client: {
    outfit: "saluto",
    claim: "Casa e lavori di casa, con persone verificate del Veneto.",
    points: ["Richieste dei clienti verificate con un SMS", "Recensioni solo da chi ha fatto una richiesta", "Prezzi indicativi prima di chiamare"],
    switchText: "Hai un'attività?",
    switchLink: { href: "/accedi/azienda", label: "Vai all'accesso aziende" },
  },
  business: {
    outfit: "partner",
    claim: "Richieste verificate dalla tua zona, senza intermediari.",
    points: ["Ogni richiesta arriva con il numero verificato via SMS", "Lead, token e abbonamento in un'unica area", "La tua scheda compare appena il piano è attivo"],
    switchText: "Cerchi casa o un professionista?",
    switchLink: { href: "/accedi", label: "Vai all'accesso clienti" },
  },
} as const;

export function AuthScreen({ audience, searchParams }: { audience: Audience; searchParams: SearchParams }) {
  const screen = SCREEN[audience];
  // Il conto di prova è un'azienda: lo mostriamo solo dove serve.
  const demo = demoMode() && audience === "business" ? DEMO_ACCOUNT : undefined;
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-10 px-4 py-6 sm:px-10 lg:px-16 lg:py-8">
        <Wordmark />
        <main id="contenuto" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8">
          {/* Un solo modulo, mai sostituito dopo il caricamento: quello che si scrive non va perso. */}
          <LoginForm
            audience={audience}
            demo={demo}
            notice={
              <Suspense fallback={null}>
                <OAuthNotice searchParams={searchParams} />
              </Suspense>
            }
          />
          <p className="text-body-s text-ink-2">
            {screen.switchText}{" "}
            <Link href={screen.switchLink.href} className="font-semibold text-primary underline">
              {screen.switchLink.label}
            </Link>
          </p>
        </main>
        <p className="mx-auto w-full max-w-sm text-caption text-ink-2">
          Continuando accetti i{" "}
          <Link href="/termini" className="underline">
            Termini
          </Link>{" "}
          e l&apos;
          <Link href="/privacy" className="underline">
            Informativa privacy
          </Link>
          .
        </p>
      </div>
      <aside className="hidden flex-col justify-center gap-10 bg-brand px-16 py-16 text-on-brand lg:flex">
        <Geco outfit={screen.outfit} size={220} priority />
        <div className="flex max-w-md flex-col gap-6">
          <p className="font-display text-h2">{screen.claim}</p>
          <ul className="flex flex-col gap-3 text-body text-on-brand-muted">
            {screen.points.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-salvia-300" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
