import { Suspense } from "react";
import { ComingSoon } from "@/components/partner/coming-soon";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { requirePartner } from "@/lib/auth/session";

export const metadata = { title: "Notifiche" };

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Notifications />
    </Suspense>
  );
}

async function Notifications() {
  const { partner } = await requirePartner();
  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader title="Notifiche" partnerName={partner.displayName} />
      <ComingSoon
        title="Preferenze di notifica"
        items={["email per ogni nuovo lead (già attiva)", "notifiche push dall'app installata sul telefono", "WhatsApp in una fase successiva"]}
      />
    </div>
  );
}
