import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { LogOut } from "lucide-react";
import { logout } from "@/app/accedi/actions";
import { EmailVerifyBanner } from "@/components/site/email-verify-banner";
import { DeleteAccountForm, RevokeMarketingButton } from "@/components/site/client-privacy";
import { CookiePreferencesButton } from "@/components/site/consent";
import { ButtonLink, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { deletesViaSupport, marketingConsentOf } from "@/lib/data/client-data";
import { asClient } from "@/lib/db/tenant";
import { leads, partners, users } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "La mia area",
  robots: { index: false },
};

/** Stati visti dal cliente (PRD §5.7): il dettaglio del lavoro del partner resta interno. */
const clientStatus = (s: string) => (s === "new" ? "Inviata" : s === "seen" ? "Vista dal professionista" : "Ricontattato");

export default function ClientAreaPage() {
  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <Suspense fallback={null}>
        <EmailVerifyBanner audience="client" />
      </Suspense>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
        <ClientArea />
      </Suspense>
    </div>
  );
}

async function ClientArea() {
  const user = await requireUser();
  // Le richieste sono legate all'email: si vedono solo dopo averla confermata (vedi client-data.ts), e la RLS di
  // asClient lo garantisce anche nel database.
  const { verified, requests } = await asClient(user.id, async (tx) => {
    const [u] = await tx.select({ verified: users.emailVerifiedAt }).from(users).where(eq(users.id, user.id)).limit(1);
    const rows = await tx
      .select({
        id: leads.id,
        requestType: leads.requestType,
        status: leads.status,
        createdAt: leads.createdAt,
        partner: partners.displayName,
      })
      .from(leads)
      .innerJoin(partners, eq(partners.id, leads.partnerId))
      .where(and(eq(leads.clientEmail, user.email), isNotNull(leads.verifiedAt)))
      .orderBy(desc(leads.createdAt));
    return { verified: u?.verified ?? null, requests: rows };
  });
  const marketing = !!verified && (await marketingConsentOf(user.email));
  const viaSupport = await deletesViaSupport(user);

  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-h1">Ciao, {user.name}</h1>
          <p className="text-body-s text-ink-2">{user.email}</p>
        </div>
        <form action={logout}>
          <button className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-body-s text-ink-2 hover:bg-muted">
            <LogOut className="size-4" aria-hidden /> Esci
          </button>
        </form>
      </header>
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-h2">Le tue richieste</h2>
        {requests.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-lg border border-line bg-surface p-6">
            <p className="text-body">
              {verified ? "Non hai ancora inviato richieste con questa email." : "Dopo aver confermato l'email qui vedrai le richieste inviate con questo indirizzo."}
            </p>
            <ButtonLink href="/trova-professionista">Trova un professionista</ButtonLink>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{r.partner}</p>
                  <p className="text-body-s text-ink-2">
                    {r.requestType} · {r.createdAt.toLocaleDateString("it-IT")}
                  </p>
                </div>
                <span className="text-body-s font-medium">{clientStatus(r.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="privacy-title" className="flex flex-col gap-4">
        <h2 id="privacy-title" className="font-display text-h2">
          I tuoi dati e la privacy
        </h2>
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
          <div className="flex flex-col gap-2 p-4">
            <h3 className="font-semibold">Scarica i tuoi dati</h3>
            <p className="text-body-s text-ink-2">
              Un file con il tuo account, le richieste inviate e i messaggi all&apos;assistenza.
              {!verified && " Le richieste compaiono dopo aver confermato l'email."}
            </p>
            {/* Link normale, non <Link>: la route risponde con un file da scaricare, non con una pagina. */}
            <a href="/area-cliente/dati" download className={buttonVariants({ size: "s", variant: "secondary", className: "self-start" })}>
              Scarica i dati
            </a>
          </div>
          <div className="flex flex-col items-start gap-2 p-4">
            <h3 className="font-semibold">Consensi</h3>
            <p className="text-body-s text-ink-2">
              {marketing
                ? "Hai accettato di ricevere comunicazioni promozionali in una richiesta di contatto."
                : "Non ricevi comunicazioni promozionali."}
            </p>
            {marketing && <RevokeMarketingButton />}
            <CookiePreferencesButton className="text-body-s font-semibold text-primary underline underline-offset-2" />
          </div>
          <div className="flex flex-col gap-3 p-4">
            <h3 className="font-semibold">Elimina l&apos;account</h3>
            {viaSupport ? (
              <p className="text-body-s text-ink-2">
                Questo account gestisce un&apos;azienda o il gestionale: per eliminarlo{" "}
                <Link href="/assistenza" className="font-semibold text-primary underline underline-offset-2">
                  scrivi all&apos;assistenza
                </Link>
                , così sistemiamo anche abbonamento e fatture.
              </p>
            ) : (
              <>
                <p className="text-body-s text-ink-2">
                  Cancelliamo il tuo account. Le aziende a cui hai scritto tengono la richiesta, ma senza nome, contatti e
                  descrizione. Non si può annullare.
                </p>
                <DeleteAccountForm />
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
