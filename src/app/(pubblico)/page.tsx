import type { Metadata } from "next";
import { Suspense } from "react";
import { EntryBlocks } from "@/components/site/home/entry-blocks";
import { Hero } from "@/components/site/home/hero";
import { HowItWorks } from "@/components/site/home/how-it-works";
import { ProvinceExplorer } from "@/components/site/home/province-explorer";
import { SponsorStrip } from "@/components/site/home/sponsor-strip";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/**
 * Home, sul modello di thumbtack.com (navbar e hero), con i blocchi pensati per geco:
 * due accessi, fascia delle aziende in evidenza, come funziona, province del Veneto.
 */
export default function HomePage() {
  return (
    <>
      <Hero next="#da-dove-partire" />
      <EntryBlocks id="da-dove-partire" />
      <Suspense fallback={<div className="h-[26rem] bg-page" aria-hidden />}>
        <SponsorStrip />
      </Suspense>
      <HowItWorks />
      <section aria-labelledby="province" className="bg-page py-28 md:py-36">
        <div className="container-page">
          <div data-reveal>
            <h2 id="province" className="font-display text-[2.25rem] leading-[1.08] tracking-[-0.02em] text-balance md:text-display-l">
              Professionisti fidati, vicino a te
            </h2>
            {/* Province attive in ACTIVE_PROVINCES (src/lib/domain/coverage.ts): aggiornare il testo quando se ne apre un'altra. */}
            <p className="mt-4 max-w-xl text-body-l text-neutro-700">
              Siamo partiti dalla provincia di Treviso. Abiti in un&apos;altra provincia? Inoltra una richiesta: arriviamo prima dove ce lo
              chiedete di più.
            </p>
          </div>
          <ProvinceExplorer />
        </div>
      </section>
    </>
  );
}
