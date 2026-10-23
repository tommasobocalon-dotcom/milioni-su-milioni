import type { Metadata } from "next";
import { PartnerSidebar } from "@/components/partner/sidebar";

export const metadata: Metadata = { title: { default: "Area Partner", template: "%s · Area Partner" }, robots: { index: false } };

export default function PartnerLayout({ children }: LayoutProps<"/area-partner">) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <PartnerSidebar />
      <main id="contenuto" className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
