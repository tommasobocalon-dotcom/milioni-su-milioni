import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { LoginForm, type Audience } from "@/components/site/login-form";
import { Wordmark } from "@/components/site/wordmark";
import { DEMO_ACCOUNT } from "@/lib/auth/demo";
import { getSessionUser, landingPathFor } from "@/lib/auth/session";
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

/** Avvisi di ritorno dai link via email (?avviso=...). */
const NOTICES: Record<string, { text: string; tone: "ok" | "error" }> = {
  "email-confermata": { text: "Email confermata. Ora puoi accedere.", tone: "ok" },
  "link-scaduto": { text: "Il link non è più valido. Accedi e chiedine uno nuovo dalla tua area.", tone: "error" },
};

async function OAuthNotice({ searchParams }: { searchParams: SearchParams }) {
  const { errore, avviso } = await searchParams;
  const oauth = oauthMessage(typeof errore === "string" ? errore : undefined);
  const notice = oauth ? { text: oauth, tone: "error" as const } : typeof avviso === "string" ? NOTICES[avviso] : undefined;
  if (!notice) return null;
  return (
    <p
      role={notice.tone === "error" ? "alert" : "status"}
      className={
        notice.tone === "error"
          ? "rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error"
          : "rounded-md border border-success bg-brand-soft px-3.5 py-2.5 text-body-s text-ink"
      }
    >
      {notice.text}
    </p>
  );
}

/**
 * Chi è già entrato da questo accesso (sessione di 30 giorni) non rivede il login. Le sessioni sono separate:
 * essere dentro come azienda non salta il login clienti, e viceversa.
 */
async function RedirectIfSignedIn({ audience, searchParams }: { audience: Audience; searchParams: SearchParams }) {
  const user = await getSessionUser(audience);
  if (!user) return null;
  const { next } = await searchParams;
  redirect(await landingPathFor(user.id, audience, typeof next === "string" ? next : undefined));
}

/** Cosa cambia tra l'accesso dei clienti (/accedi) e quello delle aziende (/accedi/azienda). */
const SCREEN = {
  client: {
    claim: "Casa e lavori di casa, con persone verificate del Veneto.",
    points: ["Richieste dei clienti verificate con un SMS", "Recensioni solo da chi ha fatto una richiesta", "Prezzi indicativi prima di chiamare"],
    switchText: "Hai un'attività?",
    switchLink: { href: "/accedi/azienda", label: "Vai all'accesso aziende" },
  },
  business: {
    claim: "Richieste verificate dalla tua zona, senza intermediari.",
    points: ["Ogni richiesta arriva con il numero verificato via SMS", "Richieste, crediti e abbonamento in un'unica area", "La tua scheda compare appena il piano è attivo"],
    switchText: "Cerchi casa o un professionista?",
    switchLink: { href: "/accedi", label: "Vai all'accesso clienti" },
  },
} as const;

export function AuthScreen({ audience, searchParams }: { audience: Audience; searchParams: SearchParams }) {
  const screen = SCREEN[audience];
  // Il conto di prova è un'azienda: lo mostriamo solo dove serve.
  const demo = demoMode() && audience === "business" ? DEMO_ACCOUNT : undefined;
  return (
    <AuthShell audience={audience}>
      <Suspense fallback={null}>
        <RedirectIfSignedIn audience={audience} searchParams={searchParams} />
      </Suspense>
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
    </AuthShell>
  );
}

/** Cornice delle pagine di accesso: modulo a sinistra, geco e punti di forza a destra. */
export function AuthShell({ audience = "client", children }: { audience?: Audience; children: React.ReactNode }) {
  const screen = SCREEN[audience];
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-10 px-4 py-6 sm:px-10 lg:px-16 lg:py-8">
        <Wordmark />
        <main id="contenuto" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8">
          {children}
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
        <p aria-hidden className="font-wordmark text-5xl font-extrabold tracking-[-0.01em]">GECOITALIA</p>
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
