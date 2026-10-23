import { Suspense } from "react";
import { Check, CreditCard, FileText } from "lucide-react";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { ButtonLink } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth/session";
import { getSubscription } from "@/lib/data/partner-area";
import { formatEuro } from "@/lib/domain/format";

export const metadata = { title: "Abbonamento" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Subscription />
    </Suspense>
  );
}

async function Subscription() {
  const { partner } = await requirePartner();
  const sub = await getSubscription(partner.id);
  if (!sub) {
    return (
      <div className="flex flex-col gap-6">
        <PartnerPageHeader title="Abbonamento" partnerName={partner.displayName} />
        <p className="text-body">Nessun abbonamento attivo.</p>
        <ButtonLink href="/per-i-professionisti#piani" className="self-start">
          Scegli un piano
        </ButtonLink>
      </div>
    );
  }
  const yearly = sub.period === "yearly";
  const used = Math.min(100, Math.round((sub.leadsUsed / Math.max(1, sub.leadsIncluded)) * 100));
  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Abbonamento" subtitle="Pagamento anticipato, rinnovo automatico" partnerName={partner.displayName} planCode={sub.planCode} />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="caps-label text-ink-2">Piano attuale</p>
              <p className="font-display text-h1">{sub.planName}</p>
              <p className="text-body-s text-ink-2">
                {yearly ? `${formatEuro(sub.yearlyPriceCents)} + IVA all'anno` : `${formatEuro(sub.monthlyPriceCents)} + IVA al mese`} ·{" "}
                {sub.status === "active" ? "attivo" : sub.status}
              </p>
            </div>
            <p className="text-body-s">
              Prossimo rinnovo: <strong>{dateFmt.format(sub.currentPeriodEnd)}</strong>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex justify-between text-body-s">
              <span>Lead del periodo</span>
              <span className="font-semibold">
                {sub.leadsUsed} di {sub.leadsIncluded}
              </span>
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={100} aria-label="Lead usati nel periodo">
              <div className="h-full rounded-full bg-primary" style={{ width: `${used}%` }} />
            </div>
          </div>
          <ul className="grid gap-2 text-body-s sm:grid-cols-2">
            {[
              `${sub.leadsIncluded} lead inclusi ogni periodo`,
              `Fino a ${sub.maxProvinces} ${sub.maxProvinces === 1 ? "provincia" : "province"}`,
              sub.maxServices ? `Fino a ${sub.maxServices} servizi nel listino` : "Servizi nel listino illimitati",
              sub.maxPortfolioItems ? `${sub.maxPortfolioItems} elementi di portfolio` : "Portfolio illimitato",
              `${sub.maxUsers} ${sub.maxUsers === 1 ? "utente" : "utenti"} per l'azienda`,
              sub.renewalTokens ? `${sub.renewalTokens} token omaggio a ogni rinnovo` : "Nessun token omaggio",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-4 text-success" aria-hidden /> {t}
              </li>
            ))}
          </ul>
          <ButtonLink href="/per-i-professionisti#piani" variant="secondary" size="s" className="self-start">
            Confronta i piani
          </ButtonLink>
        </section>
        <aside className="flex flex-col gap-4">
          <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5">
            <h2 className="inline-flex items-center gap-2 text-h4 font-semibold">
              <CreditCard className="size-4" aria-hidden /> Pagamento e fatture
            </h2>
            <p className="text-body-s text-ink-2">
              Metodo di pagamento, cambio piano e fatture elettroniche si gestiranno dal portale sicuro di Stripe, collegato nella prossima
              versione.
            </p>
          </section>
          <section className="flex flex-col gap-2 rounded-lg bg-subtle p-5">
            <h2 className="inline-flex items-center gap-2 text-h4 font-semibold">
              <FileText className="size-4" aria-hidden /> Regole
            </h2>
            <p className="text-body-s">
              Se un pagamento non va a buon fine l&apos;account viene sospeso subito e si riattiva da solo al pagamento riuscito. La
              disdetta vale a fine periodo pagato.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
