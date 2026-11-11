import { Suspense } from "react";
import { connection } from "next/server";
import { type CheckoutState, simulateHomeSponsor, simulateSearchBoost, startHomeSponsorCheckout, startSearchBoostCheckout } from "@/app/area-partner/actions";
import { AreaExtensionPicker } from "@/components/partner/area-extension-picker";
import { CheckoutButton, PaymentNotice } from "@/components/partner/checkout-button";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { Button, ButtonLink } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { requirePartner } from "@/lib/auth/session";
import { stripeConfigured } from "@/lib/billing/stripe";
import { getMunicipalities } from "@/lib/data/catalog";
import { getBoostEnd, getMunicipalityExtensions, getSubscription } from "@/lib/data/partner-area";
import { demoMode } from "@/lib/demo-mode";
import { formatEuro } from "@/lib/domain/format";
import { canBoost } from "@/lib/domain/ranking";
import {
  HOME_SPONSOR_PACKAGES,
  homeSponsorPrice,
  launchDate,
  PROMO_MONTHS,
  promoActive,
  SEARCH_BOOST_PACKAGES,
} from "@/lib/domain/offers";

export const metadata = { title: "Boost e sponsorizzazioni" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" });

export default function SponsorshipsPage({ searchParams }: PageProps<"/area-partner/sponsorizzazioni">) {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      {searchParams.then((sp) => (
        <Sponsorships payment={sp.pagamento === "ricevuto" ? "received" : sp.pagamento === "ok" ? "started" : null} />
      ))}
    </Suspense>
  );
}

async function Sponsorships({ payment }: { payment: "received" | "started" | null }) {
  const { partner, memberRole } = await requirePartner();
  await connection();
  const now = new Date();
  const [sub, homeEnd, searchEnd, extensions, places] = await Promise.all([
    getSubscription(partner.id),
    getBoostEnd(partner.id, "home", now),
    getBoostEnd(partner.id, "search", now),
    getMunicipalityExtensions(partner.id, now),
    getMunicipalities(),
  ]);
  const launch = launchDate();
  const dev = demoMode();
  const stripeOn = stripeConfigured();
  const canBuy = !!sub && canBoost(sub.planWeight);

  // Un solo pulsante d'acquisto per tutte le offerte: Stripe se configurato, simulazione nell'ambiente di prova.
  const buy = (checkout: () => Promise<CheckoutState>, simulate: () => Promise<void>, primary = false) =>
    stripeOn ? (
      <CheckoutButton action={checkout} size="s" variant={primary ? "primary" : "secondary"} disabled={memberRole !== "owner"}>
        Acquista
      </CheckoutButton>
    ) : dev ? (
      <form action={simulate}>
        <Button type="submit" size="s" variant={primary ? "primary" : "secondary"}>
          Simula
        </Button>
      </form>
    ) : (
      <Button size="s" variant="secondary" disabled>
        Acquista
      </Button>
    );

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Boost e sponsorizzazioni" partnerName={partner.displayName} logoUrl={partner.logoUrl} planCode={sub?.planCode} />

      {payment === "received" && (
        <PaymentNotice received>Acquisto attivo. Ricevuta via email.</PaymentNotice>
      )}
      {payment === "started" && (
        <PaymentNotice>Il tuo acquisto si attiva appena Stripe conferma il pagamento (con SEPA in qualche giorno).</PaymentNotice>
      )}

      {!canBuy && (
        <section className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface px-6 py-16 text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-subtle text-primary">
            <Lock className="size-7" aria-hidden />
          </span>
          <h2 className="text-h3 font-semibold">Disponibile con i piani Normal e Premium</h2>
          <p className="max-w-md text-body-s text-ink-2">
            Logo in Home, boost nella ricerca ed estensione territoriale si sbloccano passando a un piano superiore.
          </p>
          <ButtonLink href="/area-partner/abbonamento">{sub ? "Cambia piano" : "Scegli il piano"}</ButtonLink>
        </section>
      )}

      {canBuy && (
        <>
          <Panel id="home" title="Logo in Home" meta={homeEnd ? `Attivo fino al ${dateFmt.format(homeEnd)}` : "Pagamento in euro"}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {HOME_SPONSOR_PACKAGES.map((p) => {
                const price = homeSponsorPrice(p, now, launch);
                return (
                  <Offer
                    key={p.code}
                    title={`${p.days} giorni`}
                    price={
                      <>
                        {price.promo && (
                          <span className="mr-1 rounded-full bg-promo px-2 py-0.5 text-caption font-bold text-ink">
                            Promo · risparmi {formatEuro(price.listCents - price.cents)}
                          </span>
                        )}{" "}
                        {price.promo && <s className="text-ink-2">{formatEuro(price.listCents)}</s>} <strong>{formatEuro(price.cents)}</strong> + IVA
                      </>
                    }
                  >
                    {buy(startHomeSponsorCheckout.bind(null, p.code), simulateHomeSponsor.bind(null, p.code), true)}
                  </Offer>
                );
              })}
            </ul>
            {promoActive(now, launch) && <p className="text-caption font-semibold text-promo-ink">Prezzi promo per i primi {PROMO_MONTHS} mesi dal lancio.</p>}
          </Panel>

          <Panel id="boost" title="Boost nella ricerca" meta={searchEnd ? `Attivo fino al ${dateFmt.format(searchEnd)}` : "Primi posti in Trova professionista"}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {SEARCH_BOOST_PACKAGES.map((p) => (
                <Offer key={p.code} title={`${p.hours} ore`} price={<><strong>{formatEuro(p.priceCents)}</strong> + IVA</>}>
                  {buy(startSearchBoostCheckout.bind(null, p.code), simulateSearchBoost.bind(null, p.code), true)}
                </Offer>
              ))}
            </ul>
            <p className="text-caption text-ink-2">Premium: riquadro grande in cima, a rotazione. Normal: tra i primi, con la scheda verde. Sempre &quot;Sponsorizzato&quot;.</p>
          </Panel>

          <Panel id="estensione" title="Estensione territoriale" meta="Compari nelle ricerche di altri comuni">
            {extensions.length > 0 && (
              <ul aria-label="Comuni attivi" className="flex flex-wrap gap-2">
                {extensions.map((e) => (
                  <li key={e.id} className="rounded-full bg-subtle px-3 py-1 text-body-s">
                    {e.name} ({e.provinceCode}) · fino al {dateFmt.format(e.endsAt)}
                  </li>
                ))}
              </ul>
            )}
            <AreaExtensionPicker
              comuni={places.map((p) => ({ id: p.id, label: `${p.name} (${p.provinceCode})` }))}
              mode={stripeOn ? "stripe" : dev ? "simulate" : "off"}
              disabled={memberRole !== "owner"}
            />
          </Panel>

        </>
      )}

    </div>
  );
}

function Panel({ id, title, meta, children }: { id?: string; title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-4 rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-h4 font-semibold">{title}</h2>
        {meta && <p className="text-body-s text-ink-2">{meta}</p>}
      </div>
      {children}
    </section>
  );
}

function Offer({ title, price, children }: { title: string; price: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-line p-4">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-body-s">{price}</p>
      </div>
      {children}
    </li>
  );
}
