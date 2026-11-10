import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileView } from "@/components/site/profile";
import { TrackEvent } from "@/components/site/track-event";
import { getPartnerProfile } from "@/lib/data/partners";
import { listPublicPartnerPaths } from "@/lib/data/paths";

export async function generateStaticParams() {
  const paths = await listPublicPartnerPaths();
  return paths.filter((p) => p.type !== "agency").map((p) => ({ provincia: p.provinceSlug, categoria: p.categorySlug, slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/professionisti/[provincia]/[categoria]/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPartnerProfile(slug);
  // Schede non attive (in attivazione, sospese): nessun dato nel titolo, come per la pagina 404.
  if (!p || p.accountStatus !== "active") return {};
  return {
    title: `${p.displayName} — ${p.categoryName} a ${p.municipalityName}`,
    description: `${p.tagline}. Prezzi indicativi, recensioni verificate e richiesta di contatto gratuita.`,
    alternates: { canonical: p.href },
  };
}

export default function ProfessionalPage({ params }: PageProps<"/professionisti/[provincia]/[categoria]/[slug]">) {
  return <Suspense>{params.then((p) => <Profile {...p} />)}</Suspense>;
}

async function Profile({ provincia, categoria, slug }: { provincia: string; categoria: string; slug: string }) {
  const p = await getPartnerProfile(slug);
  if (!p || p.type === "agency" || p.accountStatus !== "active") notFound();
  if (p.provinceSlug !== provincia || p.categorySlug !== categoria) permanentRedirect(p.href);
  return (
    <>
      <ProfileView p={p} />
      <TrackEvent partnerId={p.id} type="view" />
    </>
  );
}
