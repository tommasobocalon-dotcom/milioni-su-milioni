import type { Metadata } from "next";
import { Suspense } from "react";
import { BellLink, UnreadBell } from "@/components/partner/bell";
import { BoostLock } from "@/components/partner/boost-lock";
import { CompanySwitcher } from "@/components/partner/company-switcher";
import { PartnerSidebar } from "@/components/partner/sidebar";
import { PartnerTabs } from "@/components/partner/tabs";
import { EmailVerifyBanner } from "@/components/site/email-verify-banner";
import { requirePartner } from "@/lib/auth/session";

export const metadata: Metadata = { title: { default: "Area Partner", template: "%s · Area Partner" }, robots: { index: false } };

const bell = (
  <Suspense fallback={<BellLink unread={0} />}>
    <UnreadBell />
  </Suspense>
);
const boostLock = (
  <Suspense fallback={null}>
    <BoostLock />
  </Suspense>
);

/** Da sospeso il menu si riduce ad abbonamento e aiuto, senza campanella: le altre pagine rimandano all'abbonamento. */
async function Sidebar() {
  const { partner } = await requirePartner({ allowSuspended: true });
  return partner.accountStatus === "suspended" ? <PartnerSidebar bell={null} suspended /> : <PartnerSidebar bell={bell} boostLock={boostLock} />;
}

export default function PartnerLayout({ children }: LayoutProps<"/area-partner">) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Suspense fallback={<PartnerSidebar bell={bell} boostLock={boostLock} />}>
        <Sidebar />
      </Suspense>
      <main id="contenuto" className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <Suspense fallback={null}>
          <div className="mb-6 empty:hidden">
            <EmailVerifyBanner audience="business" />
          </div>
        </Suspense>
        <Suspense fallback={null}>
          <CompanySwitcher />
        </Suspense>
        {/* L'URL è un dato della richiesta: le schede arrivano dentro un Suspense. */}
        <Suspense fallback={null}>
          <PartnerTabs />
        </Suspense>
        {children}
      </main>
    </div>
  );
}
