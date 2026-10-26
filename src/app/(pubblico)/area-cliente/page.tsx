import type { Metadata } from "next";
import { Suspense } from "react";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { LogOut } from "lucide-react";
import { logout } from "@/app/accedi/actions";
import { EmailVerifyBanner } from "@/components/site/email-verify-banner";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { leads, partners } from "@/lib/db/schema";

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
        <EmailVerifyBanner />
      </Suspense>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
        <ClientArea />
      </Suspense>
    </div>
  );
}

async function ClientArea() {
  const user = await requireUser();
  const requests = await db
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
            <p className="text-body">Non hai ancora inviato richieste con questa email.</p>
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
    </>
  );
}
