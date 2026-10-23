import { Suspense } from "react";
import { ComingSoon } from "@/components/partner/coming-soon";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { requirePartner } from "@/lib/auth/session";

export const metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Portfolio />
    </Suspense>
  );
}

async function Portfolio() {
  const { partner } = await requirePartner();
  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Portfolio" partnerName={partner.displayName} />
      <ComingSoon
        title="Gestione del portfolio"
        items={[
          partner.type === "agency"
            ? "immobili con contratto, prezzo, metri quadri, locali e stato (disponibile, trattativa, venduto)"
            : "lavori svolti con foto prima e dopo, comune e descrizione",
          "caricamento foto con compressione automatica",
          "vetrina \"In evidenza\" nella home della zona, a token",
        ]}
      />
    </div>
  );
}
