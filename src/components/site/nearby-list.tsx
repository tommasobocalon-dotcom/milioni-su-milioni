import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import type { NearbyPartner } from "@/lib/data/nearby";
import { formatDistanceKm, formatRating, formatResponseTime } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

/** Elenco dei partner dal più vicino, con lo stesso numero del punto sul radar. */
export function NearbyList({ partners, compact }: { partners: NearbyPartner[]; compact?: boolean }) {
  return (
    <ol className="flex flex-col gap-2">
      {partners.map((p, i) => {
        const response = formatResponseTime(p.responseMinutes);
        return (
          <li
            key={p.id}
            className={cn("entra flex items-center gap-4 rounded-lg bg-surface", compact ? "px-3 py-2.5" : "flex-wrap px-4 py-4 sm:flex-nowrap")}
            style={{ "--ritardo": Math.min(i, 4) } as React.CSSProperties}
          >
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-body-s font-bold text-on-brand" aria-hidden>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-semibold">
                <Link href={p.href} className="hover:text-primary hover:underline sm:truncate">
                  {p.displayName}
                </Link>
                {p.verified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verificato" />}
              </p>
              <p className="text-body-s text-ink-2">
                {p.categoryName} · {p.municipalityName} ({p.provinceCode})
                {!compact && response && ` · risponde in ${response}`}
              </p>
              {/* Sul telefono voto e distanza vanno sotto il nome, così il nome non viene tagliato. */}
              <p className="mt-1 flex items-center gap-3 text-body-s font-semibold sm:hidden">
                {p.rating.count > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-4 fill-star text-star" aria-hidden /> {formatRating(p.rating.average)}
                    <span className="sr-only">su 5</span>
                  </span>
                )}
                <span className="tabular-nums">{formatDistanceKm(p.distanceKm)}</span>
              </p>
            </div>
            {p.rating.count > 0 && (
              <span className="hidden shrink-0 items-center gap-1 text-body-s font-semibold sm:inline-flex">
                <Star className="size-4 fill-star text-star" aria-hidden />
                {formatRating(p.rating.average)}
                <span className="sr-only">su 5</span>
              </span>
            )}
            <span className="hidden w-16 shrink-0 text-right text-body-s font-semibold tabular-nums sm:inline">{formatDistanceKm(p.distanceKm)}</span>
            {!compact && (
              <ButtonLink href={p.contactHref} size="s" className="w-full sm:w-auto">
                Richiedi contatto
              </ButtonLink>
            )}
          </li>
        );
      })}
    </ol>
  );
}
