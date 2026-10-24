import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { Badge, planBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { LogoPartner } from "@/components/ui/logo-partner";
import { Rating } from "@/components/ui/stars";
import type { PartnerListItem } from "@/lib/data/search";
import { formatDistanceKm, formatResponseTime } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

/** Componente "Card partner" di Figma (varianti Organico / Sponsorizzato). */
export function PartnerCard({ p, headingLevel = 3 }: { p: PartnerListItem; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as "h2" | "h3";
  const response = formatResponseTime(p.responseMinutes);
  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-5 sm:flex-row",
        p.sponsored ? "border-ambra-500/40 bg-sponsor" : "border-line bg-surface",
      )}
    >
      <Link href={p.href} tabIndex={-1} aria-hidden className="self-start">
        <LogoPartner name={p.displayName} src={p.logoUrl} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {p.sponsored && <Badge kind="sponsored" className="self-start" />}
        <div className="flex flex-wrap items-center gap-2">
          <H className="text-h4 font-semibold">
            <Link href={p.href} className="hover:text-primary hover:underline">
              {p.displayName}
            </Link>
          </H>
          {p.verified && <Badge kind="verified" />}
        </div>
        <p className="text-body-s text-ink-2">
          {p.categoryName} · {p.tagline}
        </p>
        <Rating average={p.rating.average} count={p.rating.count} />
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-s text-ink-2">
          {response && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-4" aria-hidden /> Risponde in {response}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden />
            {p.municipalityName} ({p.provinceCode})
            {p.distanceKm !== null && ` · ${formatDistanceKm(p.distanceKm)}`}
          </span>
        </p>
        {p.price && (
          <p className="self-start rounded-md bg-subtle px-2.5 py-1 text-body-s">
            {p.price.serviceName} <strong className="font-semibold">{p.price.label}</strong>
            <span title="Prezzo indicativo pubblicato dal partner"> *</span>
          </p>
        )}
      </div>
      <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end sm:justify-between">
        {p.planCode && <Badge kind={planBadge(p.planCode)} className="hidden sm:inline-flex" />}
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <ButtonLink href={`/richiesta/${p.slug}`} size="s">
            Richiedi contatto
          </ButtonLink>
          <Link href={p.href} className="text-center text-body-s font-semibold text-primary hover:underline">
            Vedi il profilo
          </Link>
        </div>
      </div>
    </article>
  );
}
