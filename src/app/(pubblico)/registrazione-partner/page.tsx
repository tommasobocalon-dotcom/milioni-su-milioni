import type { Metadata } from "next";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PartnerSignupForm, type OptionGroup } from "@/components/site/partner-signup-form";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getCategories, getMunicipalities } from "@/lib/data/catalog";
import { db } from "@/lib/db/client";
import { partnerMembers } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Registra la tua attività",
  description: "Crea la scheda della tua agenzia, studio tecnico o impresa artigiana e ricevi richieste verificate dalla tua zona.",
};

const TYPE_LABEL = { agency: "Agenzie immobiliari", technician: "Studi tecnici", artisan: "Artigiani", b2b: "Servizi per la casa" } as const;

const STEPS = ["Account", "Dati dell'attività", "Piano"];

function Steps({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2 text-body-s" aria-label="Passi della registrazione">
      {STEPS.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className={cn("flex items-center gap-2", i === current ? "font-semibold text-ink" : "text-ink-2")}>
          <span
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-full text-caption font-semibold",
              i < current ? "bg-brand-soft text-brand" : i === current ? "bg-brand text-on-brand" : "bg-muted text-ink-2",
            )}
          >
            {i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}

export default function PartnerSignupPage() {
  return (
    <section className="container-page flex max-w-3xl flex-col gap-8 py-12">
      <div className="flex flex-col gap-3">
        <p className="caps-label text-ink-2">Registrazione partner</p>
        <h1 className="font-display text-h1">Porta la tua attività su geco</h1>
        <p className="text-body text-ink-2">
          Pochi dati per creare la scheda, poi scegli il piano. La scheda compare nei risultati appena il piano è attivo.
        </p>
      </div>
      <Suspense fallback={<Steps current={0} />}>
        <SignupStep />
      </Suspense>
    </section>
  );
}

async function SignupStep() {
  const user = await getSessionUser("business");
  if (!user) {
    return (
      <>
        <Steps current={0} />
        <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
          <h2 className="text-h3 font-semibold">Prima crea il tuo account personale</h2>
          <p className="text-body-s text-ink-2">
            Serve per entrare nell&apos;Area Partner: email e password. Se hai già un account, accedi.
          </p>
          <ButtonLink href="/accedi/azienda?next=/registrazione-partner" className="self-start">
            Crea account o accedi
          </ButtonLink>
        </div>
      </>
    );
  }

  const [member] = await db.select({ id: partnerMembers.partnerId }).from(partnerMembers).where(eq(partnerMembers.userId, user.id)).limit(1);
  if (member) redirect("/area-partner/abbonamento");

  const [categories, places] = await Promise.all([getCategories(), getMunicipalities()]);
  const categoryGroups: OptionGroup[] = (Object.keys(TYPE_LABEL) as (keyof typeof TYPE_LABEL)[])
    .map((t) => ({ label: TYPE_LABEL[t], options: categories.filter((c) => c.partnerType === t).map((c) => ({ value: c.id, label: c.name })) }))
    .filter((g) => g.options.length > 0);
  const placeGroups: OptionGroup[] = [...new Set(places.map((p) => p.provinceName))].sort().map((province) => ({
    label: `Provincia di ${province}`,
    options: places.filter((p) => p.provinceName === province).map((p) => ({ value: String(p.id), label: p.name })),
  }));

  return (
    <>
      <Steps current={1} />
      <p className="text-body-s">
        Accesso come <strong>{user.email}</strong>: sarai il titolare dell&apos;account aziendale.
      </p>
      <PartnerSignupForm categories={categoryGroups} places={placeGroups} />
    </>
  );
}
