import { Suspense } from "react";
import { Check } from "lucide-react";
import { openBillingPortal } from "@/app/area-partner/actions";
import { CheckoutButton, PaymentNotice } from "@/components/partner/checkout-button";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PlanChooser } from "@/components/partner/plan-chooser";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { ButtonLink } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth/session";
import { changePromoUsed, pendingPlanChange, stripeConfigured } from "@/lib/billing/stripe";
import { getSubscription, hadStripeSubscription } from "@/lib/data/partner-area";
import { getPlansWithPromo } from "@/lib/data/plans";
import { demoMode } from "@/lib/demo-mode";
import { changePromo } from "@/lib/domain/offers";
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
  current?: { code: string; period: "monthly" | "yearly"; partnerId: string };
}) {
  const all = await getPlansWithPromo();
  // Nel cambio piano la promo vale una volta per azienda (stessa regola di createPlanChangeSession), mai sul piano attuale.
  const used = current ? await changePromoUsed(current.partnerId) : false;
  const isCurrent = (code: string, period: "monthly" | "yearly") => current?.code === code && current.period === period;
  const plans = all.map((p) => ({
    code: p.code,
    name: p.name,
    monthlyPriceCents: p.monthlyPriceCents,
    yearlyPriceCents: p.yearlyPriceCents,
    promo: {
      monthly: isCurrent(p.code, "monthly") ? null : changePromo(p.promo.monthly, used),
      yearly: isCurrent(p.code, "yearly") ? null : changePromo(p.promo.yearly, used),
    },
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
  // Discesa programmata nel portale: il database cambia solo al rinnovo, qui si dice subito. Se Stripe non risponde, niente avviso.
  const pending = stripeOn && sub.stripeSubscriptionId ? await pendingPlanChange(sub.stripeSubscriptionId).catch(() => null) : null;
  const pendingName = pending && (await getPlansWithPromo()).find((p) => p.code === pending.planCode)?.name;
  const portal = stripeOn && sub.stripeSubscriptionId && (
    <CheckoutButton action={openBillingPortal} variant="secondary" className="self-start" disabled={!owner}>
      Apri pagamenti e fatture
    </CheckoutButton>
  );
  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Il tuo abbonamento" partnerName={partner.displayName} logoUrl={partner.logoUrl} planCode={sub.planCode} />
      {notice}
      {pending && pendingName && (
        <p role="status" className="rounded-lg bg-subtle p-4 text-body-s">
          <strong>
            Dal {dateFmt.format(pending.from)} passi a {pendingName} {pending.period === "yearly" ? "annuale" : "mensile"}.
          </strong>{" "}
          Fino ad allora resti in {sub.planName}, già pagato. Se scegli un altro piano qui sotto vale quello, al posto di questo cambio.
        </p>
      )}
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
              Con la promo, salendo o scendendo, il nuovo piano è attivo da subito: il periodo parte oggi e paghi il prezzo in promo meno i
              giorni non usati del piano attuale. La promo vale per un solo cambio. Senza promo: salendo paghi solo la differenza per i giorni
              che restano, scendendo il cambio parte dal prossimo rinnovo, così non perdi ciò che hai già pagato.
            </p>
          </div>
          <Chooser owner={owner} demo={demo} trial={false} current={{ code: sub.planCode, period: sub.period, partnerId: partner.id }} />
        </section>
      )}
      <p className="text-body-s text-ink-2">
        Se un pagamento non va a buon fine la scheda viene sospesa subito e torna visibile da sola al pagamento riuscito.
      </p>
    </div>
  );
}
