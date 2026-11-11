import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileView } from "@/components/site/profile";
import { TrackEvent } from "@/components/site/track-event";
import { getPartnerProfile } from "@/lib/data/partners";
import { listPublicPartnerPaths } from "@/lib/data/paths";

export async function generateStaticParams() {
  const paths = await listPublicPartnerPaths();
  return paths.filter((p) => p.type === "agency").map((p) => ({ provincia: p.provinceSlug, slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/agenzie/[provincia]/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPartnerProfile(slug);
  // Schede non attive (in attivazione, sospese): nessun dato nel titolo, come per la pagina 404.
  if (!p || p.accountStatus !== "active") return {};
  return {
    title: `${p.displayName} — agenzia immobiliare a ${p.municipalityName}`,
    description: `${p.tagline}. Specializzazioni, portfolio immobili e richiesta di contatto gratuita.`,
    alternates: { canonical: p.href },
  };
}

export default function AgencyPage({ params }: PageProps<"/agenzie/[provincia]/[slug]">) {
  return <Suspense>{params.then((p) => <Profile {...p} />)}</Suspense>;
}

async function Profile({ provincia, slug }: { provincia: string; slug: string }) {
  const p = await getPartnerProfile(slug);
  if (!p || p.type !== "agency" || p.accountStatus !== "active") notFound();
  if (p.provinceSlug !== provincia) permanentRedirect(p.href);
  return (
    <>
      <ProfileView p={p} />
      <TrackEvent partnerId={p.id} type="view" />
    </>
  );
}
