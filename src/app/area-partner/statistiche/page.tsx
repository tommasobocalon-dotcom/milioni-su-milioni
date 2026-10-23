import { Suspense } from "react";
import { ComingSoon } from "@/components/partner/coming-soon";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { requirePartner } from "@/lib/auth/session";

export const metadata = { title: "Statistiche" };

export default function StatsPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Stats />
    </Suspense>
  );
}

async function Stats() {
  const { partner } = await requirePartner();
  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Statistiche" partnerName={partner.displayName} />
      <ComingSoon
        title="Statistiche della scheda"
        items={[
          "visualizzazioni, comparse nei risultati e clic su \"Richiedi contatto\"",
          "lead ricevuti, tasso e tempo di risposta",
          "rendimento dei boost: token spesi, visualizzazioni e lead extra",
          "con il piano Professional, confronto anonimo con la media della zona",
        ]}
      />
    </div>
  );
}
