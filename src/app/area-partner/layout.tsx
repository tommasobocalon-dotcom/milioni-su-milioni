import type { Metadata } from "next";
import { Suspense } from "react";
import { BellLink, UnreadBell } from "@/components/partner/bell";
import { PartnerSidebar } from "@/components/partner/sidebar";
import { PartnerTabs } from "@/components/partner/tabs";
import { EmailVerifyBanner } from "@/components/site/email-verify-banner";

export const metadata: Metadata = { title: { default: "Area Partner", template: "%s · Area Partner" }, robots: { index: false } };

export default function PartnerLayout({ children }: LayoutProps<"/area-partner">) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <PartnerSidebar
        bell={
          <Suspense fallback={<BellLink unread={0} />}>
            <UnreadBell />
          </Suspense>
        }
      />
      <main id="contenuto" className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <Suspense fallback={null}>
          <div className="mb-6 empty:hidden">
            <EmailVerifyBanner />
          </div>
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
