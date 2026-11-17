import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Results, ResultsSkeleton } from "@/components/site/results";
import { getCategoryBySlug, getMunicipalities } from "@/lib/data/catalog";
import { searchPartners } from "@/lib/data/search";

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
  if (!landing) return {};
  const { category, place } = landing;
  return {
    title: `${category.pluralName} a ${place.name}`,
    description: `${category.pluralName} che lavorano a ${place.name} (${place.provinceCode}): confronta prezzi indicativi, zone servite e lavori svolti, poi chiedi un contatto gratis.`,
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
  return <Results mode={category.partnerType === "agency" ? "agency" : "pro"} params={{ categoria: category.slug, dove: place.name }} />;
}
