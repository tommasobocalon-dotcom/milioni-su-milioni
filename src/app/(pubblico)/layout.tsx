import { Suspense } from "react";
import { ConsentBanner } from "@/components/site/consent";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        Vai al contenuto
      </a>
      <SiteHeader />
      <main id="contenuto" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      {/* Legge l'indirizzo della pagina (usePathname): con Cache Components va dentro un Suspense. */}
      <Suspense fallback={null}>
        <ConsentBanner />
      </Suspense>
    </>
  );
}
