import { Suspense } from "react";
import { EntryBlocks } from "@/components/site/home/entry-blocks";
import { Hero } from "@/components/site/home/hero";
import { HowItWorks } from "@/components/site/home/how-it-works";
import { ProvinceExplorer } from "@/components/site/home/province-explorer";
import { SponsorStrip } from "@/components/site/home/sponsor-strip";

/**
 * Home, sul modello di thumbtack.com (navbar e hero), con i blocchi pensati per geco:
 * due accessi, fascia delle aziende in evidenza, come funziona, province del Veneto.
 */
export default function HomePage() {
  return (
    <>
      <Hero next="#da-dove-partire" />
      <EntryBlocks id="da-dove-partire" />
      <Suspense fallback={<div className="h-[26rem] bg-surface" aria-hidden />}>
        <SponsorStrip />
      </Suspense>
      <HowItWorks />
      <section aria-labelledby="province" className="bg-surface py-28 md:py-36">
        <div className="container-page">
          <div data-reveal className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-10">
            <h2 id="province" className="font-display text-[2.25rem] leading-[1.08] tracking-[-0.02em] text-balance md:text-display-l">
              Professionisti fidati, vicino a te
            </h2>
            <p className="max-w-xl text-body-l text-neutro-700">
              Scegli la tua provincia o cerca direttamente il tuo comune: ti mostriamo chi lavora nella tua zona.
            </p>
          </div>
          <ProvinceExplorer />
        </div>
      </section>
    </>
  );
}
