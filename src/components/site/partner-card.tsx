import Link from "next/link";
import { Award, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { LogoPartner } from "@/components/ui/logo-partner";
import type { PartnerListItem } from "@/lib/data/search";
import { formatDistanceKm } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

/**
 * Componente "Card partner" di Figma. Piano e boost si riconoscono a colpo d'occhio (richieste del cliente, 5/11 e 9/11/2026):
 * ogni scheda Elite o Pro ha in alto una fascia col nome del piano; se l'azienda ha anche un boost attivo, la fascia è più
 * piena e a destra c'è "Sponsorizzato" (obbligatorio, PRD §7.3, Omnibus/P2B). Base = scheda semplice, senza fascia.
 * Premium = bordo e fascia lilla, in Trova professionista e in Trova casa (cliente, 11/11/2026). Normal = bordo e fascia verdi su scheda
 * bianca; con il boost tutta la scheda prende la velatura salvia delle card della Home (sage-wash).
 * Niente badge "Verificato" né prezzo nelle schede (cliente, 9/11/2026): si vedono nel profilo.
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
  const boosted = p.sponsored;
  const band = premium
    ? boosted
      ? "bg-lavanda-300"
      : "bg-tertiary"
    : normal
      ? boosted
        ? "bg-brand-soft/60"
        : "bg-brand-soft/30"
      : "bg-muted";
  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border",
        normal && boosted ? "sage-wash" : "bg-surface",
        premium
          ? "border-2 border-lavanda-300"
          : normal
            ? "border-2 border-brand-soft/60"
            : "border-line",
      )}
    >
      {(premium || normal || boosted) && (
        <div className={cn("flex flex-wrap items-center gap-2 px-5 py-2", band)}>
          {(premium || normal) && (
            <span className="caps-label inline-flex items-center gap-1.5 text-ink">
              {premium ? (
                <Star className="size-3.5 fill-ambra-500 text-ambra-500" aria-hidden />
              ) : (
                <Award className="size-3.5 text-primary" aria-hidden />
              )}
              {premium ? "Partner Elite" : "Partner Pro"}
            </span>
          )}
          {boosted && <Badge kind="sponsored" className="ml-auto h-7 bg-surface px-2.5 text-body-s font-semibold" />}
        </div>
      )}
      <div className="flex flex-col gap-4 p-5 sm:flex-row">
        <Link href={p.href} tabIndex={-1} aria-hidden className="self-start">
          <LogoPartner name={p.displayName} src={p.logoUrl} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <H className="text-h4 font-semibold">
              <Link
                href={p.href}
                className="hover:text-primary hover:underline"
              >
                {p.displayName}
              </Link>
            </H>
          </div>
          <p className="text-body-s text-ink-2">
            {p.categoryName} · {p.tagline}
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-s text-ink-2">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" aria-hidden />
              {p.municipalityName} ({p.provinceCode})
              {p.distanceKm !== null && ` · ${formatDistanceKm(p.distanceKm)}`}
            </span>
          </p>
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
