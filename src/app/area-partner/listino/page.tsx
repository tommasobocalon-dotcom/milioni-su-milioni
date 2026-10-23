import { Suspense } from "react";
import { Info } from "lucide-react";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { requirePartner } from "@/lib/auth/session";
import { getPriceList, getSubscription } from "@/lib/data/partner-area";
import { formatPriceRange, PRICE_UNIT_LABEL, type PriceUnit } from "@/lib/domain/format";

export const metadata = { title: "Listino prezzi" };

export default function PriceListPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <PriceList />
    </Suspense>
  );
}

async function PriceList() {
  const { partner } = await requirePartner();
  const [rows, sub] = await Promise.all([getPriceList(partner.id), getSubscription(partner.id)]);
  const limit = sub?.maxServices ?? null;
  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title="Listino prezzi"
        subtitle="Prezzi indicativi mostrati sul profilo e nei risultati di ricerca"
        partnerName={partner.displayName}
        planCode={sub?.planCode}
      />
      <p className="flex items-start gap-3 rounded-md bg-info-soft p-4 text-body-s">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        I prezzi sono sempre mostrati come indicativi: il preventivo definitivo lo fai tu dopo il contatto. Servizi nel listino:{" "}
        {rows.length}
        {limit ? ` di ${limit} con il piano ${sub?.planName}` : " · illimitati con il tuo piano"}.
      </p>
      <section className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[640px] text-left text-body-s">
          <thead className="bg-subtle text-caption text-ink-2">
            <tr>
              <th className="px-5 py-3 font-semibold">Servizio</th>
              <th className="px-5 py-3 font-semibold">Unità</th>
              <th className="px-5 py-3 font-semibold">Prezzo indicativo</th>
              <th className="px-5 py-3 font-semibold">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const price = formatPriceRange(r.priceFrom, r.priceTo, r.unit as PriceUnit);
              return (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-5 py-3.5 font-medium">{r.serviceName}</td>
                  <td className="px-5 py-3.5 text-ink-2">{PRICE_UNIT_LABEL[r.unit as PriceUnit]}</td>
                  <td className="px-5 py-3.5 font-semibold">{price ?? "Su preventivo"}</td>
                  <td className="px-5 py-3.5 text-ink-2">{r.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <p className="text-caption text-ink-2">La modifica del listino dall&apos;Area Partner arriva nella prossima versione.</p>
    </div>
  );
}
