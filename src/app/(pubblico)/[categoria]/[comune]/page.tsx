import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Results, ResultsSkeleton } from "@/components/site/results";
import { ChipLink } from "@/components/ui/chip";
import { getCategories, getCategoryBySlug, getMunicipalities, type Place } from "@/lib/data/catalog";
import { listCategoryPlacePaths } from "@/lib/data/paths";
import { searchPartners } from "@/lib/data/search";
import { distanceKm, aLuogo } from "@/lib/domain/format";

/**
 * Pagine "categoria × comune" per i motori di ricerca (PRD §15), es. /idraulico/padova: lo stesso elenco di Trova
 * Professionista o Trova Casa filtrato su categoria e comune, con titolo, descrizione e indirizzo canonico propri.
 * Solo slug esatti e solo dove lavora almeno un'azienda attiva (le stesse coppie della sitemap); il resto è 404.
 */
async function findLanding(categoria: string, comune: string) {
  const [category, places] = await Promise.all([getCategoryBySlug(categoria), getMunicipalities()]);
  const place = places.find((m) => m.slug === comune);
  if (!category || !place) return null;
  const { total } = await searchPartners({ categoryId: category.id, place });
  return total > 0 ? { category, place } : null;
}

export async function generateMetadata({ params }: PageProps<"/[categoria]/[comune]">): Promise<Metadata> {
  const { categoria, comune } = await params;
  const landing = await findLanding(categoria, comune);
  if (!landing) return { title: "Pagina non trovata" };
  const { category, place } = landing;
  return {
    title: `${category.pluralName} ${aLuogo(place.name)}`,
    description: `${category.pluralName} che lavorano ${aLuogo(place.name)} (${place.provinceCode}): confronta prezzi indicativi, zone servite e lavori svolti, poi chiedi un contatto gratis.`,
    alternates: { canonical: `/${category.slug}/${place.slug}` },
  };
}

export default function CategoryPlacePage({ params }: PageProps<"/[categoria]/[comune]">) {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      {params.then((p) => (
        <Landing {...p} />
      ))}
    </Suspense>
  );
}

async function Landing({ categoria, comune }: { categoria: string; comune: string }) {
  const landing = await findLanding(categoria, comune);
  if (!landing) notFound();
  const { category, place } = landing;
  return (
    <>
      <Results mode={category.partnerType === "agency" ? "agency" : "pro"} params={{ categoria: category.slug, dove: place.name }} />
      <RelatedLinks category={category} place={place} />
    </>
  );
}

/** Link alle pagine vicine (stessa categoria nei comuni più vicini, altre categorie nello stesso comune): così i motori di ricerca le trovano tutte. */
async function RelatedLinks({ category, place }: { category: { slug: string; pluralName: string }; place: Place }) {
  const [paths, places, categories] = await Promise.all([listCategoryPlacePaths(), getMunicipalities(), getCategories()]);
  const placeBySlug = new Map(places.map((m) => [m.slug, m]));
  const nearby = paths
    .filter((x) => x.categorySlug === category.slug && x.municipalitySlug !== place.slug)
    .map((x) => placeBySlug.get(x.municipalitySlug))
    .filter((m): m is Place => !!m)
    .sort((a, b) => distanceKm(place, a) - distanceKm(place, b))
    .slice(0, 12);
  const otherCategories = categories.filter((c) => c.slug !== category.slug && paths.some((x) => x.categorySlug === c.slug && x.municipalitySlug === place.slug));
  if (nearby.length === 0 && otherCategories.length === 0) return null;

  return (
    <div className="container-page flex flex-col gap-8 pb-12">
      {nearby.length > 0 && (
        <section aria-labelledby="vicini" className="flex flex-col gap-3">
          <h2 id="vicini" className="text-h4 font-semibold">
            {category.pluralName} nei comuni vicini
          </h2>
          <ul className="flex flex-wrap gap-2">
            {nearby.map((m) => (
              <li key={m.slug}>
                <ChipLink href={`/${category.slug}/${m.slug}`}>{m.name}</ChipLink>
              </li>
            ))}
          </ul>
        </section>
      )}
      {otherCategories.length > 0 && (
        <section aria-labelledby="altri-servizi" className="flex flex-col gap-3">
          <h2 id="altri-servizi" className="text-h4 font-semibold">
            Altri servizi {aLuogo(place.name)}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {otherCategories.map((c) => (
              <li key={c.slug}>
                <ChipLink href={`/${c.slug}/${place.slug}`}>{c.pluralName}</ChipLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
