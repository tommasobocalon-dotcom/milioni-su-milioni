import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Geco } from "@/components/site/geco";
import { LeadWizard } from "@/components/site/lead-wizard";
import { TrackEvent } from "@/components/site/track-event";
import { LogoPartner } from "@/components/ui/logo-partner";
import { getMunicipalities } from "@/lib/data/catalog";
import { getRequestContext } from "@/lib/data/partners";
import { listPublicPartnerPaths } from "@/lib/data/paths";

export const metadata: Metadata = { title: "Richiedi un contatto", robots: { index: false } };

export async function generateStaticParams() {
  const paths = await listPublicPartnerPaths();
  return paths.map((p) => ({ slug: p.slug }));
}

export default function RequestPage({ params, searchParams }: PageProps<"/richiesta/[slug]">) {
  return (
    <div className="container-page py-8">
      <Suspense fallback={<div className="h-[600px] animate-pulse rounded-lg bg-muted" />}>
        {Promise.all([params, searchParams]).then(([p, sp]) => (
          <Request slug={p.slug} service={typeof sp.servizio === "string" ? sp.servizio : undefined} />
        ))}
      </Suspense>
    </div>
  );
}

async function Request({ slug, service }: { slug: string; service?: string }) {
  const [ctx, places] = await Promise.all([getRequestContext(slug), getMunicipalities()]);
  if (!ctx || ctx.partner.accountStatus !== "active") notFound();
  return (
    <div className="flex flex-col gap-6">
      <Suspense>
        <TrackEvent partnerId={ctx.partner.id} type="contact_click" />
      </Suspense>
      <Link href={ctx.partner.href} className="inline-flex items-center gap-1 self-start text-body-s font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Torna al profilo
      </Link>
      <h1 className="font-display text-h1">Richiedi un contatto a {ctx.partner.displayName}</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <LeadWizard ctx={ctx} places={places.map((p) => `${p.name} (${p.provinceCode})`)} initialServiceSlug={service} />
        <aside className="flex flex-col gap-4 self-start rounded-lg bg-subtle p-6">
          <div className="flex items-center gap-3">
            <LogoPartner name={ctx.partner.displayName} src={ctx.partner.logoUrl} size={48} />
            <div>
              <p className="font-semibold">{ctx.partner.displayName}</p>
              <p className="text-body-s text-ink-2">
                {ctx.partner.categoryName} · {ctx.partner.municipalityName}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md bg-surface p-4">
            <Geco outfit="pensa" size={56} />
            <p className="text-body-s">
              <span className="font-semibold">Il geco suggerisce:</span> indica metri quadri e tempi anche se sono una stima. Il
              primo contatto sarà più utile e il preventivo più preciso.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
