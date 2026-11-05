import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { LogoPartner } from "@/components/ui/logo-partner";
import { Rating } from "@/components/ui/stars";
import type { PartnerListItem } from "@/lib/data/search";
import { formatDistanceKm } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

/**
 * Componente "Card partner" di Figma. Il piano si riconosce a colpo d'occhio (richiesta del cliente, 5/11/2026):
 * Premium = bordo e fascia oro "Partner Elite", Normal = bordo verde a sinistra e badge "Partner Pro", Base = scheda semplice.
 * "Sponsorizzato" (boost) resta sempre scritto: è obbligatorio (PRD §7.3, Omnibus/P2B).
 */
export function PartnerCard({
  p,
  headingLevel = 3,
}: {
  p: PartnerListItem;
  headingLevel?: 2 | 3;
}) {
  const H = `h${headingLevel}` as "h2" | "h3";
  const premium = p.planCode === "premium";
  const normal = p.planCode === "normal";
  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-surface",
        premium
          ? "border-2 border-ambra-500"
          : normal
            ? "border-line border-l-4 border-l-primary"
            : "border-line",
      )}
    >
      {premium && (
        <div className="flex items-center gap-2 bg-ambra-100 px-5 py-2">
          <span className="caps-label inline-flex items-center gap-1.5 text-ink">
            <Star
              className="size-3.5 fill-ambra-500 text-ambra-500"
              aria-hidden
            />{" "}
            Partner Elite
          </span>
          {p.sponsored && (
            <Badge kind="sponsored" className="ml-auto bg-surface" />
          )}
        </div>
      )}
      <div className="flex flex-col gap-4 p-5 sm:flex-row">
        <Link href={p.href} tabIndex={-1} aria-hidden className="self-start">
          <LogoPartner name={p.displayName} src={p.logoUrl} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {p.sponsored && !premium && (
            <Badge kind="sponsored" className="self-start" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <H className="text-h4 font-semibold">
              <Link
                href={p.href}
                className="hover:text-primary hover:underline"
              >
                {p.displayName}
              </Link>
            </H>
            {normal && <Badge kind="normal" />}
            {p.verified && <Badge kind="verified" />}
          </div>
          <p className="text-body-s text-ink-2">
            {p.categoryName} · {p.tagline}
          </p>
          <Rating average={p.rating.average} count={p.rating.count} />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-s text-ink-2">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" aria-hidden />
              {p.municipalityName} ({p.provinceCode})
              {p.distanceKm !== null && ` · ${formatDistanceKm(p.distanceKm)}`}
            </span>
          </p>
          {p.price && (
            <p className="self-start rounded-md bg-subtle px-2.5 py-1 text-body-s">
              {p.price.serviceName}{" "}
              <strong className="font-semibold">{p.price.label}</strong>
              <span title="Prezzo indicativo pubblicato dal partner"> *</span>
            </p>
          )}
        </div>
        <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end sm:justify-end">
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <ButtonLink href={`/richiesta/${p.slug}`} size="s">
              Richiedi contatto
            </ButtonLink>
            <Link
              href={p.href}
              className="text-center text-body-s font-semibold text-primary hover:underline"
            >
              Vedi il profilo
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
