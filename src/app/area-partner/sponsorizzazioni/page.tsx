import { TrackConversion } from "@/components/site/consent";
import { Suspense } from "react";
import { connection } from "next/server";
import { simulateHomeSponsor, simulateSearchBoost, startHomeSponsorCheckout, startSearchBoostCheckout } from "@/app/area-partner/actions";
import { AreaExtensionPicker } from "@/components/partner/area-extension-picker";
import { PaymentNotice } from "@/components/partner/checkout-button";
import { PackagePicker, type PackageOption } from "@/components/partner/package-picker";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { ButtonLink } from "@/components/ui/button";
import { LogoPartner } from "@/components/ui/logo-partner";
import { Award, Check, Lock, MapPin, Star } from "lucide-react";
import { requirePartner } from "@/lib/auth/session";
import { stripeConfigured } from "@/lib/billing/stripe";
import { getMunicipalities } from "@/lib/data/catalog";
import { getBoostEnd, getHomeMunicipality, getMunicipalityExtensions, getSubscription } from "@/lib/data/partner-area";
import { demoMode } from "@/lib/demo-mode";
import { formatEuro } from "@/lib/domain/format";
import { canBoost } from "@/lib/domain/ranking";
import {
  AREA_EXTENSION_OFFER,
  HOME_SPONSOR_PACKAGES,
  homeSponsorPrice,
  launchDate,
  PROMO_MONTHS,
  promoActive,
  SEARCH_BOOST_PACKAGES,
} from "@/lib/domain/offers";
import { cn } from "@/lib/utils";

export const metadata = { title: "Boost e sponsorizzazioni" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" });
const dateTimeFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

export default function SponsorshipsPage({ searchParams }: PageProps<"/area-partner/sponsorizzazioni">) {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      {searchParams.then((sp) => (
        <>
          <Sponsorships payment={sp.pagamento === "ricevuto" ? "received" : sp.pagamento === "ok" ? "started" : null} />
          {(sp.pagamento === "ricevuto" || sp.pagamento === "ok") && <TrackConversion event="purchase" />}
        </>
      ))}
    </Suspense>
  );
}

async function Sponsorships({ payment }: { payment: "received" | "started" | null }) {
  const { partner, memberRole } = await requirePartner();
  await connection();
  const now = new Date();
  const [sub, homeEnd, searchEnd, extensions, places, homeTown] = await Promise.all([
    getSubscription(partner.id),
    getBoostEnd(partner.id, "home", now),
    getBoostEnd(partner.id, "search", now),
    getMunicipalityExtensions(partner.id, now),
    getMunicipalities(),
    getHomeMunicipality(partner.id),
  ]);
  const launch = launchDate();
  const mode = stripeConfigured() ? "stripe" : demoMode() ? "simulate" : "off";
  const canBuy = !!sub && canBoost(sub.planWeight);
  const premium = sub?.planCode === "premium";
  const owner = memberRole === "owner";

  const homeOptions: PackageOption[] = HOME_SPONSOR_PACKAGES.map((p) => {
    const price = homeSponsorPrice(p, now, launch);
    return {
      code: p.code,
      title: `${p.days} giorni`,
      cents: price.cents,
      listCents: price.listCents,
      unitNote: `${formatEuro(Math.round(price.cents / p.days))} al giorno`,
      tag: price.promo ? `Promo lancio · −${formatEuro(price.listCents - price.cents)}` : undefined,
      checkout: startHomeSponsorCheckout.bind(null, p.code),
      simulate: simulateHomeSponsor.bind(null, p.code),
    };
  });
  const searchOptions: PackageOption[] = SEARCH_BOOST_PACKAGES.map((p) => ({
    code: p.code,
    title: `${p.hours} ore`,
    cents: p.priceCents,
    unitNote: p.hours === 24 ? "Un giorno intero" : `${formatEuro(Math.round((p.priceCents * 24) / p.hours))} al giorno`,
    checkout: startSearchBoostCheckout.bind(null, p.code),
    simulate: simulateSearchBoost.bind(null, p.code),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title="Boost e sponsorizzazioni"
        subtitle="Più visibilità quando ti serve: paghi una volta, senza rinnovi automatici."
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
        planCode={sub?.planCode}
      />

      {payment === "received" && <PaymentNotice received>Acquisto attivo. Ricevuta via email.</PaymentNotice>}
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
          {/* Prima lo stato, poi cosa si può comprare. */}
          <section aria-labelledby="stato" className="rounded-lg border border-line bg-surface">
            <h2 id="stato" className="sr-only">
              Le tue promozioni
            </h2>
            <ul className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <Status href="#home" label="Logo in Home" active={!!homeEnd} detail={homeEnd ? `Fino al ${dateFmt.format(homeEnd)}` : "Non attivo"} />
              <Status
                href="#boost"
                label="Boost nella ricerca"
                active={!!searchEnd}
                detail={searchEnd ? `Fino al ${dateTimeFmt.format(searchEnd)}` : "Non attivo"}
              />
              <Status
                href="#estensione"
                label="Comuni in più"
                active={extensions.length > 0}
                detail={extensions.length > 0 ? `${extensions.length} ${extensions.length === 1 ? "comune attivo" : "comuni attivi"}` : "Solo il tuo comune"}
              />
            </ul>
          </section>

          <Offer
            id="home"
            title="Logo in Home"
            lead="Il tuo logo nella fascia “Aziende in evidenza” della pagina principale, la prima che vede chi cerca casa o un professionista."
            points={["Visibile a tutti i visitatori del sito", "Il clic porta alla tua scheda", "Ordine mescolato a ogni visita, nessun limite di posti"]}
            preview={<HomePreview name={partner.displayName} logoUrl={partner.logoUrl} />}
            active={homeEnd ? `Attivo fino al ${dateFmt.format(homeEnd)}` : null}
            footnote={promoActive(now, launch) ? `Prezzi promo per i primi ${PROMO_MONTHS} mesi dal lancio del sito.` : undefined}
          >
            <PackagePicker name="home" options={homeOptions} mode={mode} disabled={!owner} renew={!!homeEnd} />
          </Offer>

          <Offer
            id="boost"
            title="Sponsorizzato nella ricerca"
            lead="La tua scheda in evidenza tra i primi risultati di Trova professionista, nella tua categoria e nei tuoi comuni. L’aspetto dipende dal tuo abbonamento."
            points={[
              "Premium: riquadro grande lilla in cima, a rotazione",
              "Normal: scheda verde tra i primi risultati",
              "Sempre con l’etichetta “Sponsorizzato”",
            ]}
            preview={<SearchPreview name={partner.displayName} logoUrl={partner.logoUrl} town={homeTown?.name} premium={premium} />}
            active={searchEnd ? `Attivo fino al ${dateTimeFmt.format(searchEnd)}` : null}
          >
            <PackagePicker name="boost" options={searchOptions} mode={mode} disabled={!owner} renew={!!searchEnd} />
          </Offer>

          <Offer
            id="estensione"
            title="Estensione territoriale"
            lead="Compari anche nelle ricerche di altri comuni del Veneto, oltre al tuo."
            points={["Qualsiasi comune del Veneto, quanti ne vuoi", `Ogni comune resta attivo ${AREA_EXTENSION_OFFER.days} giorni`, "Vale per ricerca e boost"]}
            preview={<AreaPreview home={homeTown ? `${homeTown.name} (${homeTown.provinceCode})` : null} extensions={extensions.map((e) => ({ id: e.id, label: `${e.name} (${e.provinceCode})`, until: dateFmt.format(e.endsAt) }))} />}
            active={null}
          >
            <AreaExtensionPicker comuni={places.map((p) => ({ id: p.id, label: `${p.name} (${p.provinceCode})` }))} mode={mode} disabled={!owner} />
          </Offer>

          {!owner && <p className="text-body-s text-ink-2">Solo il titolare dell’azienda può fare acquisti.</p>}
        </>
      )}
    </div>
  );
}

function Status({ href, label, active, detail }: { href: string; label: string; active: boolean; detail: string }) {
  return (
    <li>
      <a href={href} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-page focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
        <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", active ? "bg-success" : "bg-line-strong/50")} />
        <span className="flex min-w-0 flex-col">
          <span className="text-body-s text-ink-2">{label}</span>
          <span className={cn("truncate font-semibold", !active && "text-ink-2")}>
            {active && <span className="sr-only">Attivo: </span>}
            {detail}
          </span>
        </span>
      </a>
    </li>
  );
}

function Offer({
  id,
  title,
  lead,
  points,
  preview,
  active,
  footnote,
  children,
}: {
  id: string;
  title: string;
  lead: string;
  points: string[];
  preview: React.ReactNode;
  active: string | null;
  footnote?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titolo`} className="grid scroll-mt-24 gap-6 rounded-lg border border-line bg-surface p-5 md:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
      <figure className="order-last flex flex-col gap-2 lg:order-first lg:self-start">
        {preview}
        <figcaption className="text-caption text-ink-2">Anteprima di dove compari</figcaption>
      </figure>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 id={`${id}-titolo`} className="font-display text-h3 font-semibold">
              {title}
            </h2>
            {active && <span className="rounded-full bg-subtle px-2.5 py-0.5 text-caption font-semibold text-brand">{active}</span>}
          </div>
          <p className="text-body text-ink">{lead}</p>
        </div>
        <ul className="flex flex-col gap-1.5">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-body-s">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
        {children}
        {footnote && <p className="text-caption font-semibold text-promo-ink">{footnote}</p>}
      </div>
    </section>
  );
}

/** Schizzo della fascia loghi della Home, con il logo dell'azienda in primo piano. */
function HomePreview({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <div aria-hidden className="flex flex-col gap-4 rounded-md border border-line bg-page p-5">
      <span className="text-body-s font-semibold text-brand">Aziende in evidenza</span>
      <div className="grid grid-cols-4 items-center gap-3">
        <span className="h-14 rounded-md border border-line bg-surface" />
        <span className="col-span-2 flex items-center gap-2.5 rounded-md bg-surface p-2.5 ring-2 ring-primary">
          <LogoPartner name={name} src={logoUrl} size={36} />
          <span className="min-w-0 truncate text-body-s font-semibold">{name}</span>
        </span>
        <span className="h-14 rounded-md border border-line bg-surface" />
        <span className="col-span-2 h-14 rounded-md border border-line bg-surface" />
        <span className="h-14 rounded-md border border-line bg-surface" />
        <span className="h-14 rounded-md border border-line bg-surface" />
      </div>
    </div>
  );
}

/** Schizzo dei risultati di Trova professionista: la scheda in boost sopra le altre, con l'etichetta obbligatoria. */
function SearchPreview({ name, logoUrl, town, premium }: { name: string; logoUrl: string | null; town?: string; premium: boolean }) {
  return (
    <div aria-hidden className="flex flex-col gap-4 rounded-md border border-line bg-page p-5">
      <PlanExample plan="Premium" note="Riquadro grande in cima, a rotazione" mine={premium}>
        {/* Come FeaturedPartner: lilla, immagine a sinistra. */}
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] overflow-hidden rounded-md border-2 border-lavanda-300 bg-tertiary">
          <span className="flex min-h-28 items-center justify-center bg-lavanda-300">
            <LogoPartner name={name} src={logoUrl} size={52} />
          </span>
          <span className="flex min-w-0 flex-col justify-center gap-1.5 p-3">
            <span className="caps-label inline-flex items-center gap-1 text-ink">
              <Star className="size-3 fill-ambra-500 text-ambra-500" />
              Premium
            </span>
            <span className="truncate font-semibold">{name}</span>
            <PreviewTown town={town} />
            <span className="self-start rounded-full bg-surface px-2 py-0.5 text-caption font-semibold">Sponsorizzato</span>
          </span>
        </div>
      </PlanExample>
      <PlanExample plan="Normal" note="Scheda verde tra i primi risultati" mine={!premium}>
        {/* Come PartnerCard Normal con boost: fascia verde e velatura salvia. */}
        <div className="sage-wash flex flex-col overflow-hidden rounded-md border-2 border-brand-soft/60">
          <span className="flex items-center gap-2 bg-brand-soft/60 px-3 py-1.5">
            <span className="caps-label inline-flex items-center gap-1 text-ink">
              <Award className="size-3 text-primary" />
              Normal
            </span>
            <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-caption font-semibold">Sponsorizzato</span>
          </span>
          <span className="flex items-center gap-3 p-3">
            <LogoPartner name={name} src={logoUrl} size={36} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{name}</span>
              <PreviewTown town={town} />
            </span>
          </span>
        </div>
      </PlanExample>
    </div>
  );
}

function PlanExample({ plan, note, mine, children }: { plan: string; note: string; mine: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-wrap items-baseline gap-x-2 text-body-s">
        <span className="font-semibold text-brand">Con {plan}</span>
        <span className="text-ink-2">{note}</span>
        {mine && <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-caption font-semibold text-on-brand">Il tuo piano</span>}
      </span>
      {children}
    </div>
  );
}

function PreviewTown({ town }: { town?: string }) {
  return town ? (
    <span className="flex items-center gap-1 text-caption text-ink-2">
      <MapPin className="size-3" />
      {town}
    </span>
  ) : null;
}

/** Dove compare oggi l'azienda: il suo comune più quelli acquistati. */
function AreaPreview({ home, extensions }: { home: string | null; extensions: { id: number; label: string; until: string }[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-page p-5">
      <span className="text-body-s font-semibold text-brand">Dove compari oggi</span>
      <ul aria-label="Comuni attivi" className="flex flex-wrap gap-2">
        {home && (
          <li className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-body-s text-on-brand">
            <MapPin className="size-3.5" aria-hidden />
            {home} · sede
          </li>
        )}
        {extensions.map((e) => (
          <li key={e.id} className="rounded-full border border-line bg-surface px-3 py-1 text-body-s">
            {e.label} · fino al {e.until}
          </li>
        ))}
        <li aria-hidden className="rounded-full border border-dashed border-line-strong px-3 py-1 text-body-s text-ink-2">
          + altri comuni
        </li>
      </ul>
    </div>
  );
}
