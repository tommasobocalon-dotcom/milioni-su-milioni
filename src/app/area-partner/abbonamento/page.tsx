import { Suspense } from "react";
import { Check, CreditCard, FileText } from "lucide-react";
import { openBillingPortal, simulateSubscription, startSubscriptionCheckout } from "@/app/area-partner/actions";
import { CheckoutButton, PaymentNotice } from "@/components/partner/checkout-button";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { Button, ButtonLink } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth/session";
import { stripeConfigured } from "@/lib/billing/stripe";
import { getSubscription } from "@/lib/data/partner-area";
import { getPlans } from "@/lib/data/plans";
import { demoMode } from "@/lib/demo-mode";
import { formatEuro } from "@/lib/domain/format";

export const metadata = { title: "Abbonamento" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

const STATUS: Record<string, string> = {
  active: "attivo",
  activating: "in attivazione: aspettiamo la conferma del pagamento",
  suspended: "sospeso: pagamento non riuscito",
  cancelled: "disdetto",
};

export default function SubscriptionPage({ searchParams }: PageProps<"/area-partner/abbonamento">) {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      {searchParams.then((sp) => (
        <Subscription paid={sp.pagamento === "ok"} welcome={sp.benvenuto === "1"} />
      ))}
    </Suspense>
  );
}

/**
 * Scelta del piano con pagamento su Stripe Checkout (carta o addebito SEPA). Senza Stripe, in sviluppo e
 * sul sito di prova, il piano si attiva senza pagamento.
 */
async function PlanChooser({ owner, demo }: { owner: boolean; demo: boolean }) {
  const plans = await getPlans();
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-h3 font-semibold">Attiva un piano</h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <li key={p.code} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
            <p className="font-display text-h2">{p.name}</p>
            <p className="text-body-s text-ink-2">{p.leadsIncluded} richieste incluse ogni periodo</p>
            {demo ? (
              <>
                <form action={simulateSubscription.bind(null, p.code, "monthly")}>
                  <Button type="submit" size="s" className="w-full" disabled={!owner}>
                    Prova mensile senza pagare
                  </Button>
                </form>
                <form action={simulateSubscription.bind(null, p.code, "yearly")}>
                  <Button type="submit" size="s" variant="secondary" className="w-full" disabled={!owner}>
                    Prova annuale senza pagare
                  </Button>
                </form>
                <p className="text-caption text-ink-2">
                  {formatEuro(p.monthlyPriceCents)} al mese o {formatEuro(p.yearlyPriceCents)} all&apos;anno, + IVA
                </p>
              </>
            ) : (
              <>
                <CheckoutButton action={startSubscriptionCheckout.bind(null, p.code, "monthly")} size="s" disabled={!owner}>
                  {formatEuro(p.monthlyPriceCents)} + IVA al mese
                </CheckoutButton>
                <CheckoutButton action={startSubscriptionCheckout.bind(null, p.code, "yearly")} size="s" variant="secondary" disabled={!owner}>
                  {formatEuro(p.yearlyPriceCents)} + IVA all&apos;anno
                </CheckoutButton>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="text-caption text-ink-2">
        {demo && "Ambiente di prova: i pagamenti Stripe non sono configurati, il piano si attiva senza addebito. "}
        Pagamento anticipato con rinnovo automatico. Con l&apos;addebito SEPA l&apos;attivazione arriva alla conferma della banca, di solito
        in qualche giorno lavorativo; con la carta è immediata.
        {!owner && " Solo il titolare dell'account può attivare un piano."}
      </p>
    </section>
  );
}

async function Subscription({ paid, welcome }: { paid: boolean; welcome: boolean }) {
  const { partner, memberRole } = await requirePartner();
  const sub = await getSubscription(partner.id);
  const stripeOn = stripeConfigured();
  const owner = memberRole === "owner";
  const demo = !stripeOn && demoMode();
  const notice = paid && (
    <PaymentNotice>Il piano si attiva appena Stripe conferma il pagamento: con la carta in pochi secondi, con l&apos;addebito SEPA in qualche giorno lavorativo.</PaymentNotice>
  );

  if (!sub || sub.status === "cancelled") {
    return (
      <div className="flex flex-col gap-6">
        <PartnerPageHeader title="Abbonamento" partnerName={partner.displayName} logoUrl={partner.logoUrl} />
        {notice}
        {welcome && (
          <p role="status" className="rounded-lg bg-subtle p-4 text-body-s">
            <strong>Scheda creata.</strong> Ultimo passo: scegli il piano. Dopo il pagamento la scheda compare nei risultati e puoi
            completarla con descrizione, listino e foto.
          </p>
        )}
        <p className="text-body">Nessun abbonamento attivo: la tua scheda non compare nei risultati.</p>
        {stripeOn || demo ? (
          <PlanChooser owner={owner} demo={demo} />
        ) : (
          <ButtonLink href="/per-i-professionisti#piani" className="self-start">
            Scegli un piano
          </ButtonLink>
        )}
      </div>
    );
  }
  const yearly = sub.period === "yearly";
  const used = Math.min(100, Math.round((sub.leadsUsed / Math.max(1, sub.leadsIncluded)) * 100));
  const portal = stripeOn && sub.stripeSubscriptionId && (
    <CheckoutButton action={openBillingPortal} size="s" variant="secondary" className="self-start" disabled={!owner}>
      Gestisci pagamento e fatture
    </CheckoutButton>
  );
  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Abbonamento" subtitle="Pagamento anticipato, rinnovo automatico" partnerName={partner.displayName} logoUrl={partner.logoUrl} planCode={sub.planCode} />
      {notice}
      {sub.status === "suspended" && (
        <section role="alert" className="flex flex-col gap-3 rounded-lg border border-error bg-surface p-5">
          <p className="text-body font-semibold">Account sospeso: l&apos;ultimo pagamento non è andato a buon fine.</p>
          <p className="text-body-s">
            La scheda è nascosta dai risultati e non ricevi nuove richieste. Aggiorna il metodo di pagamento: l&apos;account si riattiva da solo appena il
            pagamento riesce.
          </p>
          {portal}
        </section>
      )}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="caps-label text-ink-2">Piano attuale</p>
              <p className="font-display text-h1">{sub.planName}</p>
              <p className="text-body-s text-ink-2">
                {yearly ? `${formatEuro(sub.yearlyPriceCents)} + IVA all'anno` : `${formatEuro(sub.monthlyPriceCents)} + IVA al mese`} · {STATUS[sub.status] ?? sub.status}
              </p>
            </div>
            <p className="text-body-s">
              Prossimo rinnovo: <strong>{dateFmt.format(sub.currentPeriodEnd)}</strong>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex justify-between text-body-s">
              <span>Richieste usate in questo periodo</span>
              <span className="font-semibold">
                {sub.leadsUsed} di {sub.leadsIncluded}
              </span>
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={100} aria-label="Richieste usate in questo periodo">
              <div className="h-full rounded-full bg-primary" style={{ width: `${used}%` }} />
            </div>
          </div>
          <ul className="grid gap-2 text-body-s sm:grid-cols-2">
            {[
              `${sub.leadsIncluded} richieste incluse ogni periodo`,
              `Fino a ${sub.maxProvinces} ${sub.maxProvinces === 1 ? "provincia" : "province"}`,
              sub.maxServices ? `Fino a ${sub.maxServices} servizi nel listino` : "Servizi nel listino illimitati",
              sub.maxPortfolioItems ? `${sub.maxPortfolioItems} elementi di portfolio` : "Portfolio illimitato",
              `${sub.maxUsers} ${sub.maxUsers === 1 ? "utente" : "utenti"} per l'azienda`,
              sub.renewalTokens ? `${sub.renewalTokens} crediti in omaggio a ogni rinnovo` : "Nessun credito in omaggio",
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
          <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
            <h2 className="inline-flex items-center gap-2 text-h4 font-semibold">
              <CreditCard className="size-4" aria-hidden /> Pagamento e fatture
            </h2>
            {portal ? (
              <>
                <p className="text-body-s text-ink-2">Metodo di pagamento, cambio piano, fatture e disdetta dal portale sicuro di Stripe.</p>
                {portal}
              </>
            ) : (
              <p className="text-body-s text-ink-2">
                {stripeOn
                  ? "Questo abbonamento non è collegato a Stripe (dati di esempio): il portale dei pagamenti compare dopo la prima attivazione online."
                  : "I pagamenti online non sono ancora attivi."}
              </p>
            )}
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
      {stripeOn && !sub.stripeSubscriptionId && <PlanChooser owner={owner} demo={false} />}
    </div>
  );
}
