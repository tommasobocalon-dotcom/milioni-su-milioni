import type { Metadata } from "next";
import { Suspense } from "react";
import { EntryBlocks } from "@/components/site/home/entry-blocks";
import { Hero } from "@/components/site/home/hero";
import { HowItWorks } from "@/components/site/home/how-it-works";
import { ProvinceExplorer } from "@/components/site/home/province-explorer";
import { SponsorStrip } from "@/components/site/home/sponsor-strip";
import { getCategories, getMunicipalities, getOpenProvinceCodes } from "@/lib/data/catalog";

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
            <p className="mt-4 max-w-xl text-body-l text-neutro-700">
              Partiamo dalla provincia di Treviso. Nelle altre province inoltra una richiesta: apriamo prima dove ne arrivano di più.
            </p>
          </div>
          <Provinces />
        </div>
      </section>
    </>
  );
}

/** Categorie e comuni (in cache) per il modulo "Inoltra una richiesta" delle province non ancora attive. */
async function Provinces() {
  const [categories, places, openCodes] = await Promise.all([getCategories(), getMunicipalities(), getOpenProvinceCodes()]);
  return (
    <ProvinceExplorer
      categories={categories.map(({ id, name, partnerType }) => ({ id, name, partnerType }))}
      places={places.map(({ id, name, provinceCode }) => ({ id, name, provinceCode }))}
      openCodes={openCodes}
    />
  );
}
