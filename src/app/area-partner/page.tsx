import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { connection } from "next/server";
import { LeadRow } from "@/components/partner/lead-row";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { ButtonLink } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth/session";
import { getBoostEnd, getFreePlanUsage, getOverview } from "@/lib/data/partner-area";
import { FREE_LEADS_PER_MONTH } from "@/lib/domain/free-plan";

export const metadata = { title: "Home" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long" });

export default function DashboardPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

/** Una sola cosa da fare adesso, la più utile: prima le richieste senza contatti del piano gratuito, poi le nuove, poi la scheda. */
function nextStep(newLeads: number, completeness: number, lockedLeads: number) {
  if (lockedLeads > 0)
    return {
      title: lockedLeads === 1 ? "Hai 1 richiesta senza contatti" : `Hai ${lockedLeads} richieste senza contatti`,
      text: `Questo mese hai già ricevuto le ${FREE_LEADS_PER_MONTH} richieste gratuite. Scegli un piano per vedere chi ti ha scritto.`,
      href: "/area-partner/abbonamento",
      cta: "Scegli un piano",
    };
  if (newLeads > 0)
    return {
      title: newLeads === 1 ? "Hai 1 richiesta nuova" : `Hai ${newLeads} richieste nuove`,
      text: "Chiama il cliente oggi: chi risponde presto riceve più lavori.",
      href: "/area-partner/lead?stato=new",
      cta: "Vedi le richieste",
    };
  if (completeness < 80)
    return {
      title: `La tua scheda è completa al ${completeness}%`,
      text: "Aggiungi prezzi e foto dei tuoi lavori: le schede complete compaiono più in alto.",
      href: "/area-partner/lavori",
      cta: "Completa la scheda",
    };
  return {
    title: "Tutto in ordine",
    text: "Quando arriva una nuova richiesta la trovi qui e ti avvisiamo per email.",
    href: "/area-partner/scheda",
    cta: "Guarda la tua scheda",
  };
}

async function Dashboard() {
  const { user, partner } = await requirePartner();
  await connection();
  const now = new Date();
  const [o, homeEnd] = await Promise.all([getOverview(partner.id), getBoostEnd(partner.id, "home", now)]);
  const free = o.sub?.free && o.sub.status === "active" ? await getFreePlanUsage(partner.id, now) : null;
  const hour = Number(new Intl.DateTimeFormat("it-IT", { hour: "numeric", hour12: false, timeZone: "Europe/Rome" }).format(now));
  const greeting = hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";
  const step = nextStep(o.counts.new ?? 0, o.completeness, free?.locked ?? 0);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PartnerPageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        subtitle={partner.displayName}
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
      />

      <section className="flex flex-col gap-4 rounded-lg bg-brand-soft p-6 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="text-h3 font-semibold">{step.title}</h2>
          <p className="text-body text-neutro-700">{step.text}</p>
        </div>
        <ButtonLink href={step.href}>
          {step.cta} <ArrowRight aria-hidden />
        </ButtonLink>
      </section>

      <section aria-label="Il tuo piano" className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-5">
          <p className="text-body-s text-ink-2">Il tuo piano</p>
          {free ? (
            <>
              <p className="font-display text-h1">Gratuito</p>
              <p className="text-caption text-ink-2">
                {Math.min(free.used, FREE_LEADS_PER_MONTH)} di {FREE_LEADS_PER_MONTH} richieste gratuite usate questo mese
              </p>
              <Link href="/area-partner/abbonamento" className="text-body-s font-semibold text-primary hover:underline">
                Scegli un piano
              </Link>
            </>
          ) : (
            <>
              <p className="font-display text-h1">{o.sub?.planName ?? "—"}</p>
              {o.sub && <p className="text-caption text-ink-2">Si rinnova il {dateFmt.format(o.sub.currentPeriodEnd)} · richieste illimitate</p>}
            </>
          )}
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-5">
          <p className="text-body-s text-ink-2">Logo in Home</p>
          <p className="font-display text-h1">{homeEnd ? "Attivo" : "Non attivo"}</p>
          {homeEnd && <p className="text-caption text-ink-2">Fino al {dateFmt.format(homeEnd)}</p>}
          <Link href="/area-partner/sponsorizzazioni" className="text-body-s font-semibold text-primary hover:underline">
            Vedi i pacchetti
          </Link>
        </div>
      </section>

      <section aria-labelledby="ultime-richieste" className="rounded-lg border border-line bg-surface">
        <h2 id="ultime-richieste" className="px-5 pt-5 pb-3 text-h4 font-semibold">
          Ultime richieste
        </h2>
        {o.recent.length === 0 ? (
          <p className="border-t border-line p-6 text-body-s text-ink-2">Ancora nessuna richiesta. Le nuove arrivano qui.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {o.recent.map((l) => (
              <LeadRow key={l.id} lead={l} now={now} />
            ))}
          </ul>
        )}
        <div className="border-t border-line px-5 py-4">
          <Link href="/area-partner/lead" className="inline-flex items-center gap-1 text-body-s font-semibold text-primary hover:underline">
            Vedi tutte le richieste <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      <Link href="/area-partner/statistiche" className="self-start text-body-s font-semibold text-primary hover:underline">
        Quante persone vedono la tua scheda? Guarda le statistiche
      </Link>
    </div>
  );
}
