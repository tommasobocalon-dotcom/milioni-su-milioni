import { Suspense } from "react";
import { ExternalLink, Info, ListChecks, Receipt, Tag } from "lucide-react";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PriceListEditor } from "@/components/partner/price-list-editor";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { ButtonLink } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth/session";
import { getListableServices, getPriceList, getSubscription } from "@/lib/data/partner-area";
import { getPartnerProfile } from "@/lib/data/partners";
import { formatPriceRange, type PriceUnit } from "@/lib/domain/format";

export const metadata = { title: "Prezzi" };

export default function PriceListPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <PriceList />
    </Suspense>
  );
}

async function PriceList() {
  const { partner } = await requirePartner();
  const [rows, services, sub, profile] = await Promise.all([
    getPriceList(partner.id),
    getListableServices(partner.id),
    getSubscription(partner.id),
    getPartnerProfile(partner.slug),
  ]);
  const limit = sub?.maxServices ?? null;
  const priced = rows.filter((r) => r.priceFrom !== null || r.priceTo !== null).length;
  const used = limit ? Math.min(100, Math.round((rows.length / limit) * 100)) : null;
  const priceRows = rows.map((r) => ({ ...r, unit: r.unit as PriceUnit }));

  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title="Prezzi"
        subtitle="Prezzi indicativi mostrati sul profilo e nei risultati di ricerca"
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
        planCode={sub?.planCode}
      />

      <section aria-label="Riepilogo" className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
          <p className="inline-flex items-center gap-2 text-body-s text-ink-2">
            <ListChecks className="size-4" aria-hidden /> Servizi nel listino
          </p>
          <p className="font-display text-h1 tabular-nums">
            {rows.length}
            {limit && <span className="text-h4 text-ink-2"> / {limit}</span>}
          </p>
          {used !== null ? (
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuenow={rows.length} aria-valuemin={0} aria-valuemax={limit!} aria-label="Servizi usati">
                <div className="h-full rounded-full bg-primary" style={{ width: `${used}%` }} />
              </div>
              <p className="text-caption text-ink-2">Piano {sub?.planName}</p>
            </div>
          ) : (
            <p className="text-caption text-ink-2">Illimitati con il tuo piano</p>
          )}
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
          <p className="inline-flex items-center gap-2 text-body-s text-ink-2">
            <Tag className="size-4" aria-hidden /> Con prezzo indicato
          </p>
          <p className="font-display text-h1 tabular-nums">
            {priced}
            <span className="text-h4 text-ink-2"> / {rows.length}</span>
          </p>
          <p className="text-caption text-ink-2">
            {rows.length - priced > 0 ? `${rows.length - priced} su preventivo: aggiungi una fascia per ricevere più richieste` : "Tutti i servizi mostrano un prezzo"}
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-lg bg-brand p-5 text-on-brand">
          <p className="inline-flex items-center gap-2 text-body-s text-on-brand-muted">
            <Receipt className="size-4" aria-hidden /> Sul tuo profilo pubblico
          </p>
          <ul className="flex flex-col gap-1.5 text-body-s">
            {priceRows.slice(0, 3).map((r) => (
              <li key={r.id} className="flex justify-between gap-3">
                <span className="truncate">{r.serviceName}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatPriceRange(r.priceFrom, r.priceTo, r.unit) ?? "Su preventivo"}</span>
              </li>
            ))}
            {rows.length === 0 && <li className="text-on-brand-muted">Nessun servizio ancora</li>}
          </ul>
          {profile && (
            <ButtonLink href={profile.href} target="_blank" variant="light" size="s" className="mt-auto self-start">
              Vedi il profilo <ExternalLink aria-hidden />
            </ButtonLink>
          )}
        </div>
      </section>

      <PriceListEditor rows={priceRows} services={services.map((s) => ({ ...s, defaultUnit: s.defaultUnit as PriceUnit }))} limit={limit} />

      <p className="flex items-start gap-3 rounded-md bg-info-soft p-4 text-body-s">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <span>
          I prezzi sono sempre mostrati ai clienti come <strong>indicativi</strong>: il preventivo definitivo lo fai tu dopo il contatto. Le modifiche sono
          visibili subito sul profilo pubblico e nell&apos;ordine che scegli qui.
        </span>
      </p>
    </div>
  );
}
