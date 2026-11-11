import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge, publicPlanBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { LogoPartner } from "@/components/ui/logo-partner";
import type { PartnerListItem } from "@/lib/data/search";
import { formatDistanceKm } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

/**
 * Riquadro grande in cima ai risultati: un'azienda Premium (con boost "Sponsorizzato nella ricerca" se c'è), a rotazione tra i visitatori
 * (ranking.ts). È un posto a pagamento: l'etichetta "Sponsorizzato" c'è sempre.
 * Lilla come le schede Premium, in Trova professionista e in Trova casa.
 */
export function FeaturedPartner({ p }: { p: PartnerListItem }) {
  const plan = publicPlanBadge(p.planCode);
  return (
    <article
      aria-label={`In evidenza: ${p.displayName}`}
      className={cn(
        "grid overflow-hidden rounded-lg border md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]",
        "border-lavanda-300 bg-tertiary",
      )}
    >
      <Link
        href={p.href}
        tabIndex={-1}
        aria-hidden
        className="relative block aspect-[16/10] bg-subtle md:aspect-auto md:min-h-72"
      >
        {p.coverUrl || p.logoUrl ? (
          // Senza foto dei lavori il logo riempie tutto il riquadro (richieste del cliente, 5/11 e 9/11/2026).
          <Image
            src={(p.coverUrl ?? p.logoUrl)!}
            alt=""
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover"
          />
        ) : (
          // Né foto né logo: le iniziali al centro.
          <span className="absolute inset-0 flex items-center justify-center">
            <LogoPartner name={p.displayName} src={p.logoUrl} size={96} />
          </span>
        )}
      </Link>
      <div className="flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge kind="sponsored" className="bg-surface" />
          {plan && <Badge kind={plan} className={cn(plan === "premium" && "bg-lavanda-300 [&>svg]:text-ambra-500")} />}
        </div>
        <div className="flex items-center gap-3">
          {p.coverUrl && (
            <LogoPartner name={p.displayName} src={p.logoUrl} size={48} />
          )}
          <h2 className="font-display text-h2">
            <Link href={p.href} className="hover:text-primary hover:underline">
              {p.displayName}
            </Link>
          </h2>
        </div>
        <p className="text-body text-ink-2">
          {p.categoryName} · {p.tagline}
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-s text-ink-2">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden />
            {p.municipalityName} ({p.provinceCode})
            {p.distanceKm !== null && ` · ${formatDistanceKm(p.distanceKm)}`}
          </span>
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
          <ButtonLink href={`/richiesta/${p.slug}`}>
            Richiedi contatto
          </ButtonLink>
          <Link
            href={p.href}
            className="text-body-s font-semibold text-primary hover:underline"
          >
            Vedi il profilo
          </Link>
        </div>
      </div>
    </article>
  );
}
