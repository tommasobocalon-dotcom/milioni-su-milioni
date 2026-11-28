import { TrackConversion } from "@/components/site/consent";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Check, Lock } from "lucide-react";
import { openBillingPortal, startFreePlan } from "@/app/area-partner/actions";
import { CancelSubscription, UndoCancellationButton } from "@/components/partner/cancel-subscription";
import { CheckoutButton, PaymentNotice } from "@/components/partner/checkout-button";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PlanChooser } from "@/components/partner/plan-chooser";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { Button, ButtonLink } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth/session";
import { changePromoUsed, pendingPlanChange, stripeConfigured } from "@/lib/billing/stripe";
import { getFreePlanUsage, getSubscription, hadFreePlan, hadStripeSubscription } from "@/lib/data/partner-area";
import { getPlansWithPromo } from "@/lib/data/plans";
import { demoMode } from "@/lib/demo-mode";
import { FREE_LEADS, freePlanOpen } from "@/lib/domain/free-plan";
import { changePromo, launchDate, planPromo } from "@/lib/domain/offers";
import { planFeatures } from "@/lib/domain/plan-features";
import { formatEuro } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

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
        <>
          <Subscription
            payment={sp.pagamento === "ricevuto" ? "received" : sp.pagamento === "ok" ? "started" : sp.pagamento === "cambio" ? "changed" : null}
            welcome={sp.benvenuto === "1"}
            cancellation={sp.disdetta === "ok" ? "done" : sp.disdetta === "annullata" ? "undone" : null}
          />
          {sp.benvenuto === "1" && <TrackConversion event="signup" />}
          {(sp.pagamento === "ricevuto" || sp.pagamento === "ok") && <TrackConversion event="purchase" />}
        </>
      ))}
    </Suspense>
  );
}

async function Chooser({
  owner,
  demo,
  trial,
  current,
  guaranteed = false,
}: {
  owner: boolean;
  demo: boolean;
  trial: boolean;
  current?: { code: string; period: "monthly" | "yearly"; partnerId: string };
  /** Partita dal piano gratuito: promo dell'annuale anche dopo i 6 mesi dal lancio. */
  guaranteed?: boolean;
}) {
  await connection();
  const now = new Date();
  const all = (await getPlansWithPromo()).map((p) =>
    guaranteed ? { ...p, promo: { monthly: p.promo.monthly, yearly: planPromo(p, "yearly", now, launchDate(), { guaranteed }) } } : p,
  );
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
  return <PlanChooser plans={plans} demo={demo} owner={owner} trial={trial} current={current} guaranteed={guaranteed} />;
}

async function Subscription({
  payment,
  welcome,
  cancellation,
}: {
  payment: "received" | "started" | "changed" | null;
  welcome: boolean;
  cancellation: "done" | "undone" | null;
}) {
  // Pagina raggiungibile anche con account sospeso: è qui che il partner paga per riattivarsi.
  const { partner, memberRole } = await requirePartner({ allowSuspended: true });
  const [sub, hadStripe, fromFree] = await Promise.all([getSubscription(partner.id), hadStripeSubscription(partner.id), hadFreePlan(partner.id)]);
  await connection();
  const now = new Date();
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
  // Sospensione manuale dal gestionale: l'abbonamento è in regola, quindi pagare non basta per riattivarsi.
  const teamSuspension = partner.accountStatus === "suspended" && sub?.status !== "suspended" && (
    <section role="alert" className="flex flex-col gap-2 rounded-lg border border-error bg-surface p-5">
      <p className="text-body font-semibold">Account sospeso dal team di GecoItalia.</p>
      <p className="text-body-s">
        La scheda è nascosta dai risultati e non ricevi nuove richieste. Per sapere il motivo e come riattivarlo scrivi all&apos;
        <Link href="/area-partner/assistenza" className="font-semibold text-primary underline">
          assistenza
        </Link>
        .
      </p>
    </section>
  );
  const chooser = canChoose ? (
    <Chooser owner={owner} demo={demo} trial={!hadStripe && !fromFree} guaranteed={fromFree} />
  ) : (
    <ButtonLink href="/per-i-professionisti#piani" className="self-start">
      Vedi i piani
    </ButtonLink>
  );

  // 1. Nessun piano: solo la scelta, con il piano gratuito se l'azienda non ha mai avuto un abbonamento.
  if (!sub || sub.status === "cancelled") {
    const free = !sub && freePlanOpen(now, launchDate());
    return (
      <div className="flex flex-col gap-6">
        <PartnerPageHeader title="Scegli il tuo piano" subtitle="Le richieste dei clienti sono gratis e illimitate con tutti i piani" partnerName={partner.displayName} logoUrl={partner.logoUrl} />
        {notice}
        {teamSuspension}
        {welcome && (
          <p role="status" className="rounded-lg bg-subtle p-4 text-body-s">
            <strong>Scheda creata.</strong> Ultimo passo: {free ? "parti gratis o scegli un piano" : "scegli il piano"}. La scheda compare nei
            risultati quando il piano è attivo e abbiamo verificato i dati dell&apos;azienda.
          </p>
        )}
        {!notice && !welcome && (
          <p className="rounded-lg bg-subtle p-4 text-body-s">
            {sub?.status === "cancelled"
              ? "Il tuo abbonamento è terminato: la scheda non compare più sul sito. I dati dell'azienda sono salvati, scegli un piano per tornare online."
              : "Nessun piano attivo: la tua scheda non compare nei risultati."}
          </p>
        )}
        {free && (
          <section aria-labelledby="piano-gratuito" className="flex flex-col gap-4 rounded-lg border-2 border-primary bg-surface p-6">
            <div className="flex flex-col gap-1">
              <h2 id="piano-gratuito" className="text-h3 font-semibold">
                Parti gratis
              </h2>
              <p className="text-body-s text-ink-2">
                Per il lancio la tua scheda è gratis finché non ricevi {FREE_LEADS} richieste. Poi scegli il piano che preferisci,
                sempre con le promo.
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-body-s">
              {[
                "Le funzioni del piano Base, senza carta e senza pagare nulla",
                `${FREE_LEADS} richieste con i contatti del cliente`,
                "Dopo la 3ª la scheda esce dai risultati finché non scegli un piano",
                "Le promo restano tue anche quando passi a pagamento",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <form action={startFreePlan}>
              <Button type="submit" disabled={!owner}>
                Inizia gratis
              </Button>
            </form>
            {!owner && <p className="text-caption text-ink-2">Solo il titolare dell&apos;account può attivare il piano.</p>}
          </section>
        )}
        {free && (
          <h2 className="text-h3 font-semibold">Oppure scegli subito un piano</h2>
        )}
        {chooser}
      </div>
    );
  }

  // 2. Piano gratuito di lancio: richieste usate, contatti in attesa e scelta del piano con le promo. Finito dopo le 3
  // richieste (syncFreePlan, "suspended") l'Area Partner si ferma qui finché l'azienda non paga un piano.
  if (sub.free) {
    const usage = await getFreePlanUsage(partner.id);
    const used = Math.min(usage.used, FREE_LEADS);
    const ended = sub.status === "suspended";
    return (
      <div className="flex flex-col gap-6">
        <PartnerPageHeader title={ended ? "Piano gratuito finito" : "Piano gratuito"} partnerName={partner.displayName} logoUrl={partner.logoUrl} planCode={sub.planCode} />
        {notice}
        {teamSuspension}
        {ended && (
          <section role="alert" className="flex items-start gap-4 rounded-lg border-2 border-error bg-error-soft p-6">
            <Lock className="mt-1 size-6 shrink-0 text-error" aria-hidden />
            <div className="flex flex-col gap-2">
              <p className="text-h3 font-semibold">Hai ricevuto le {FREE_LEADS} richieste gratuite</p>
              <p className="text-body">
                La tua scheda non compare più nei risultati e l&apos;Area Partner è bloccata. Scegli uno dei piani qui sotto: torni online
                appena il pagamento va a buon fine, con le promo del lancio.
              </p>
            </div>
          </section>
        )}
        {usage.locked > 0 && (
          <section role="alert" className="flex items-start gap-3 rounded-lg border border-primary bg-surface p-5 text-body-s">
            <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p>
              <strong>
                {usage.locked === 1 ? "Hai 1 richiesta" : `Hai ${usage.locked} richieste`} senza contatti.
              </strong>{" "}
              Scegli un piano qui sotto: {usage.locked === 1 ? "si sblocca" : "si sbloccano"} appena il piano è attivo.
            </p>
          </section>
        )}
        <section className="grid gap-6 rounded-lg border border-line bg-surface p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <div>
              <p id="richieste-gratuite" className="text-body-s text-ink-2">
                Richieste gratuite usate
              </p>
              <p className="font-display text-h1">
                {used} di {FREE_LEADS}
              </p>
            </div>
            {/* Una tacca per richiesta: si riempie a ogni richiesta arrivata con i contatti. */}
            <div
              role="progressbar"
              aria-labelledby="richieste-gratuite"
              aria-valuemin={0}
              aria-valuemax={FREE_LEADS}
              aria-valuenow={used}
              aria-valuetext={`${used} richieste su ${FREE_LEADS}`}
              className="flex gap-1.5"
            >
              {Array.from({ length: FREE_LEADS }, (_, i) => (
                <span key={i} className={cn("h-3 flex-1 rounded-full transition-colors", i < used ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
            <p className="text-body-s">
              {usage.left > 0
                ? `Ne puoi ricevere ancora ${usage.left}. Dopo la ${FREE_LEADS}ª la scheda esce dai risultati finché non scegli un piano.`
                : "Hai usato tutte le richieste gratuite: scegli un piano per tornare nei risultati."}
            </p>
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
        <section aria-labelledby="scegli-piano" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="scegli-piano" className="text-h3 font-semibold">
              Scegli il tuo piano
            </h2>
            <p className="text-body-s text-ink-2">
              Le promo valgono anche per te: primo mese a prezzo scontato e annuale in promo, anche dopo la fine del lancio. Paghi da subito,
              senza i 7 giorni di prova, e il piano gratuito si chiude da solo appena quello nuovo è attivo.
            </p>
          </div>
          {chooser}
        </section>
      </div>
    );
  }

  // 3. Piano attivato senza pagamento (sito di prova o dati di esempio) e pagamenti online attivi: va pagato.
  if (stripeOn && !sub.stripeSubscriptionId) {
    return (
      <div className="flex flex-col gap-6">
        <PartnerPageHeader title="Attiva il pagamento" partnerName={partner.displayName} logoUrl={partner.logoUrl} planCode={sub.planCode} />
        {notice}
        {teamSuspension}
        <p className="rounded-lg bg-ambra-100 p-4 text-body-s">
          Il piano <strong>{sub.planName}</strong> è attivo in prova, senza pagamento. Scegli il piano qui sotto per collegarlo a un
          pagamento: quello di prova si chiude da solo appena il nuovo è attivo.
        </p>
        {chooser}
      </div>
    );
  }

  // 4. Abbonamento pagato: piano, prossimo rinnovo, pagamenti e fatture.
  const yearly = sub.period === "yearly";
  // Discesa programmata nel portale: il database cambia solo al rinnovo, qui si dice subito. Se Stripe non risponde, niente avviso.
  const pending = stripeOn && sub.stripeSubscriptionId ? await pendingPlanChange(sub.stripeSubscriptionId).catch(() => null) : null;
  const pendingName = pending && (await getPlansWithPromo()).find((p) => p.code === pending.planCode)?.name;
  // Disdetta fatta (qui o nel portale): attivo fino a cancelAt, poi Stripe chiude e la scheda esce dal sito.
  const endsAt = sub.cancelAt;
  const canCancel = stripeOn && !!sub.stripeSubscriptionId && !endsAt;
  const portal = stripeOn && sub.stripeSubscriptionId && (
    <CheckoutButton action={openBillingPortal} variant="secondary" className="self-start" disabled={!owner}>
      Apri pagamenti e fatture
    </CheckoutButton>
  );
  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Il tuo abbonamento" partnerName={partner.displayName} logoUrl={partner.logoUrl} planCode={sub.planCode} />
      {notice}
      {teamSuspension}
      {cancellation === "undone" && !endsAt && (
        <p role="status" className="rounded-lg bg-subtle p-4 text-body-s">
          <strong>Disdetta annullata.</strong> L&apos;abbonamento continua e si rinnova da solo come prima.
        </p>
      )}
      {endsAt && (
        <section role="status" className="flex flex-col gap-3 rounded-lg border border-primary bg-surface p-5">
          <p className="text-body font-semibold">
            {cancellation === "done" ? "Disdetta registrata. " : ""}L&apos;abbonamento termina il {dateFmt.format(endsAt)}.
          </p>
          <p className="text-body-s">
            Fino ad allora la scheda resta visibile e ricevi le richieste. Da quel giorno la scheda non comparirà più sul sito e non ti
            addebiteremo più nulla. Ti abbiamo mandato una conferma per email. Hai cambiato idea? Puoi annullare la disdetta fino al{" "}
            {dateFmt.format(endsAt)}.
          </p>
          {stripeOn && sub.stripeSubscriptionId && <UndoCancellationButton owner={owner} />}
        </section>
      )}
      {!endsAt && pending && pendingName && (
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
              <dd className="font-semibold">{endsAt && sub.status === "active" ? "attivo, disdetto" : (STATUS[sub.status] ?? sub.status)}</dd>
            </div>
            <div>
              <dt className="text-ink-2">{endsAt ? "Termina il" : "Prossimo rinnovo"}</dt>
              <dd className="font-semibold">{dateFmt.format(endsAt ?? sub.currentPeriodEnd)}</dd>
            </div>
            <div>
              <dt className="text-ink-2">Pagamento</dt>
              <dd className="font-semibold">{endsAt ? "Nessun altro addebito" : `${yearly ? "Annuale" : "Mensile"}, automatico`}</dd>
            </div>
          </dl>
          {portal ? (
            <div className="flex flex-col gap-2">
              {portal}
              <p className="text-caption text-ink-2">Metodo di pagamento, dati di fatturazione e fatture.</p>
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
      {sub.status === "active" && !endsAt && ((stripeOn && sub.stripeSubscriptionId) || demo) && (
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
      {canCancel && <CancelSubscription until={dateFmt.format(sub.currentPeriodEnd)} owner={owner} />}
    </div>
  );
}
