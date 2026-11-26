import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { ProfilePreviewNotice, ProfileView } from "@/components/site/profile";
import { TrackEvent } from "@/components/site/track-event";
import { managesPartner } from "@/lib/auth/session";
import { getPartnerProfile } from "@/lib/data/partners";
import { listPublicPartnerPaths } from "@/lib/data/paths";
import { aLuogo } from "@/lib/domain/format";

export async function generateStaticParams() {
  const paths = await listPublicPartnerPaths();
  return paths.filter((p) => p.type === "agency").map((p) => ({ provincia: p.provinceSlug, slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/agenzie/[provincia]/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPartnerProfile(slug);
  // Schede non attive (in attivazione, sospese): nessun dato nel titolo, come per la pagina 404.
  if (!p || p.accountStatus !== "active") return { title: "Pagina non trovata", robots: { index: false } };
  return {
    title: `${p.displayName} — agenzia immobiliare ${aLuogo(p.municipalityName)}`,
    description: `${p.tagline}. Specializzazioni, portfolio immobili e richiesta di contatto gratuita.`,
    alternates: { canonical: p.href },
  };
}

export default function AgencyPage({ params }: PageProps<"/agenzie/[provincia]/[slug]">) {
  return <Suspense>{params.then((p) => <Profile {...p} />)}</Suspense>;
}

async function Profile({ provincia, slug }: { provincia: string; slug: string }) {
  const p = await getPartnerProfile(slug);
  if (!p || p.type !== "agency") notFound();
  // Scheda non ancora online (in verifica, sospesa): la vede solo chi gestisce l'azienda, come anteprima.
  const preview = p.accountStatus !== "active";
  if (preview && !(await managesPartner(p.id))) notFound();
  if (p.provinceSlug !== provincia) permanentRedirect(p.href);
  return (
    <>
      {preview && <ProfilePreviewNotice />}
      <ProfileView p={p} />
      {!preview && <TrackEvent partnerId={p.id} type="view" />}
    </>
  );
}
