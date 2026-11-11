import { Suspense } from "react";
import { Check } from "lucide-react";
import { openBillingPortal } from "@/app/area-partner/actions";
import { CheckoutButton, PaymentNotice } from "@/components/partner/checkout-button";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PlanChooser } from "@/components/partner/plan-chooser";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { ButtonLink } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth/session";
import { stripeConfigured } from "@/lib/billing/stripe";
import { getSubscription, hadStripeSubscription } from "@/lib/data/partner-area";
import { getPlansWithPromo } from "@/lib/data/plans";
import { demoMode } from "@/lib/demo-mode";
import { planFeatures } from "@/lib/domain/plan-features";
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
        <Subscription
          payment={sp.pagamento === "ricevuto" ? "received" : sp.pagamento === "ok" ? "started" : sp.pagamento === "cambio" ? "changed" : null}
          welcome={sp.benvenuto === "1"}
        />
      ))}
    </Suspense>
  );
}

async function Chooser({
  owner,
  demo,
  trial,
  current,
}: {
  owner: boolean;
  demo: boolean;
  trial: boolean;
  current?: { code: string; period: "monthly" | "yearly" };
}) {
  const plans = (await getPlansWithPromo()).map((p) => ({
    code: p.code,
    name: p.name,
    monthlyPriceCents: p.monthlyPriceCents,
    yearlyPriceCents: p.yearlyPriceCents,
    // Le promo valgono per chi si abbona, non per chi cambia piano.
    promo: current ? { monthly: null, yearly: null } : p.promo,
    features: planFeatures(p.code),
  }));
  return <PlanChooser plans={plans} demo={demo} owner={owner} trial={trial} current={current} />;
}

async function Subscription({ payment, welcome }: { payment: "received" | "started" | "changed" | null; welcome: boolean }) {
  // Pagina raggiungibile anche con account sospeso: è qui che il partner paga per riattivarsi.
  const { partner, memberRole } = await requirePartner({ allowSuspended: true });
  const [sub, hadStripe] = await Promise.all([getSubscription(partner.id), hadStripeSubscription(partner.id)]);
  const stripeOn = stripeConfigured();
  const owner = memberRole === "owner";
  const demo = !stripeOn && demoMode();
  const canChoose = stripeOn || demo;
  const notice =
    payment === "received" ? (
      <PaymentNotice received>Il piano è attivo. La ricevuta arriva per email.</PaymentNotice>
    ) : payment === "changed" ? (
      <PaymentNotice received>Cambio piano registrato. Se sei salito di piano è attivo da subito; se sei sceso parte dal prossimo rinnovo.</PaymentNotice>
    ) : (
      payment === "started" && (
        <PaymentNotice>Il piano si attiva appena Stripe conferma il pagamento: con la carta in pochi secondi, con l&apos;addebito SEPA in qualche giorno lavorativo.</PaymentNotice>
      )
    );
  const chooser = canChoose ? (
    <Chooser owner={owner} demo={demo} trial={!hadStripe} />
  ) : (
    <ButtonLink href="/per-i-professionisti#piani" className="self-start">
      Vedi i piani
    </ButtonLink>
  );

  // 1. Nessun piano: solo la scelta.
  if (!sub || sub.status === "cancelled") {
    return (
      <div className="flex flex-col gap-6">
        <PartnerPageHeader title="Scegli il tuo piano" subtitle="Le richieste dei clienti sono gratis e illimitate con tutti i piani" partnerName={partner.displayName} logoUrl={partner.logoUrl} />
        {notice}
        {welcome && (
          <p role="status" className="rounded-lg bg-subtle p-4 text-body-s">
            <strong>Scheda creata.</strong> Ultimo passo: scegli il piano. Appena è attivo la tua scheda compare nei risultati.
          </p>
        )}
        {!notice && !welcome && <p className="rounded-lg bg-subtle p-4 text-body-s">Nessun piano attivo: la tua scheda non compare nei risultati.</p>}
        {chooser}
      </div>
    );
  }

  // 2. Piano attivato senza pagamento (sito di prova o dati di esempio) e pagamenti online attivi: va pagato.
  if (stripeOn && !sub.stripeSubscriptionId) {
    return (
      <div className="flex flex-col gap-6">
        <PartnerPageHeader title="Attiva il pagamento" partnerName={partner.displayName} logoUrl={partner.logoUrl} planCode={sub.planCode} />
        {notice}
        <p className="rounded-lg bg-ambra-100 p-4 text-body-s">
          Il piano <strong>{sub.planName}</strong> è attivo in prova, senza pagamento. Scegli il piano qui sotto per collegarlo a un
          pagamento: quello di prova si chiude da solo appena il nuovo è attivo.
        </p>
        {chooser}
      </div>
    );
  }

  // 3. Abbonamento pagato: piano, prossimo rinnovo, pagamenti e fatture.
  const yearly = sub.period === "yearly";
  const portal = stripeOn && sub.stripeSubscriptionId && (
    <CheckoutButton action={openBillingPortal} variant="secondary" className="self-start" disabled={!owner}>
      Apri pagamenti e fatture
    </CheckoutButton>
  );
  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Il tuo abbonamento" partnerName={partner.displayName} logoUrl={partner.logoUrl} planCode={sub.planCode} />
      {notice}
      {sub.status === "suspended" && (
        <section role="alert" className="flex flex-col gap-3 rounded-lg border border-error bg-surface p-5">
          <p className="text-body font-semibold">Account sospeso: l&apos;ultimo pagamento non è andato a buon fine.</p>
          <p className="text-body-s">La scheda è nascosta dai risultati. Aggiorna il metodo di pagamento: l&apos;account si riattiva da solo appena il pagamento riesce.</p>
          {portal}
        </section>
      )}
      <section className="grid gap-6 rounded-lg border border-line bg-surface p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-body-s text-ink-2">Piano attuale</p>
            <p className="font-display text-h1">{sub.planName}</p>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-body-s">
            <div>
              <dt className="text-ink-2">Prezzo</dt>
              <dd className="font-semibold">{yearly ? `${formatEuro(sub.yearlyPriceCents)} all'anno` : `${formatEuro(sub.monthlyPriceCents)} al mese`} + IVA</dd>
            </div>
            <div>
              <dt className="text-ink-2">Stato</dt>
              <dd className="font-semibold">{STATUS[sub.status] ?? sub.status}</dd>
            </div>
            <div>
              <dt className="text-ink-2">Prossimo rinnovo</dt>
              <dd className="font-semibold">{dateFmt.format(sub.currentPeriodEnd)}</dd>
            </div>
            <div>
              <dt className="text-ink-2">Pagamento</dt>
              <dd className="font-semibold">{yearly ? "Annuale" : "Mensile"}, automatico</dd>
            </div>
          </dl>
          {portal ? (
            <div className="flex flex-col gap-2">
              {portal}
              <p className="text-caption text-ink-2">Cambio piano, metodo di pagamento, fatture e disdetta (vale a fine periodo pagato).</p>
            </div>
          ) : (
            !stripeOn && <p className="text-body-s text-ink-2">I pagamenti online non sono ancora attivi.</p>
          )}
        </div>
        <div className="flex flex-col gap-3 rounded-md bg-subtle p-5">
          <p className="text-body-s font-semibold">Cosa include</p>
          <ul className="flex flex-col gap-2 text-body-s">
            {planFeatures(sub.planCode).map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>
      {sub.status === "active" && ((stripeOn && sub.stripeSubscriptionId) || demo) && (
        <section aria-labelledby="cambia-piano" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="cambia-piano" className="text-h3 font-semibold">
              Cambia piano
            </h2>
            <p className="text-body-s text-ink-2">
              Sali di piano: è attivo da subito e paghi solo la differenza per i giorni che restano. Scendi di piano: il cambio parte dal
              prossimo rinnovo, così non perdi ciò che hai già pagato.
            </p>
          </div>
          <Chooser owner={owner} demo={demo} trial={false} current={{ code: sub.planCode, period: sub.period }} />
        </section>
      )}
      <p className="text-body-s text-ink-2">
        Se un pagamento non va a buon fine la scheda viene sospesa subito e torna visibile da sola al pagamento riuscito.
      </p>
    </div>
  );
}
