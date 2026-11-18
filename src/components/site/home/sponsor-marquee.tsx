"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { LogoPartner } from "@/components/ui/logo-partner";
import type { HomeSponsor } from "@/lib/data/home";
import { cn } from "@/lib/utils";

/** Scelta del boost "Logo in evidenza in Home" nell'Area Partner; chi non è entrato passa prima dal login aziende. */
export const BOOST_HREF = `/accedi/azienda?next=${encodeURIComponent("/area-partner/sponsorizzazioni#home")}`;

/**
 * Nastro dei loghi. L'ordine cambia a ogni visita (decisione del cliente): lo mescola il browser dopo il caricamento,
 * così la Home resta una pagina statica in cache invece di ricostruirsi a ogni richiesta.
 */
export function SponsorMarquee({ sponsors: initial, repeat }: { sponsors: HomeSponsor[]; repeat: number }) {
  const [sponsors, setSponsors] = useState(initial);
  // Mescolato solo dopo l'idratazione: farlo nel render darebbe un ordine diverso tra server e browser.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSponsors(shuffle(initial)), [initial]);

  return (
    <div
      className="flex w-max motion-safe:animate-[marquee-rtl_var(--marquee-duration)_linear_infinite] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center"
      style={
        {
          "--marquee-duration": `${Math.max(30, sponsors.length * repeat * 5)}s`,
        } as React.CSSProperties
      }
    >
      {Array.from({ length: repeat * 2 }, (_, i) => (
        <SponsorRow
          key={i}
          sponsors={sponsors}
          copy={i > 0}
          cta={i % repeat === 0}
        />
      ))}
    </div>
  );
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Una fila di loghi. Le copie servono solo al nastro continuo: nascoste ai lettori di schermo. "Il tuo logo qui" una volta per metà nastro. */
function SponsorRow({
  sponsors,
  copy,
  cta,
}: {
  sponsors: HomeSponsor[];
  copy?: boolean;
  cta?: boolean;
}) {
  return (
    <ul
      className={cn(
        "flex shrink-0 items-center motion-reduce:w-full motion-reduce:shrink motion-reduce:flex-wrap motion-reduce:justify-center",
        copy && "motion-reduce:hidden",
      )}
      aria-hidden={copy || undefined}
    >
      {sponsors.map((s) => (
        <li key={s.id}>
          <Link
            href={s.href}
            tabIndex={copy ? -1 : undefined}
            className="group/logo flex h-24 items-center gap-3.5 rounded-lg px-6 transition-colors hover:bg-surface md:px-8"
          >
            <LogoPartner
              name={s.displayName}
              src={s.logoUrl}
              size={52}
              className="bg-muted text-neutro-600 grayscale transition-[filter,background-color,color] duration-200 group-hover/logo:bg-brand-soft group-hover/logo:text-brand group-hover/logo:grayscale-0"
            />
            <span className="flex flex-col items-start text-left">
              <span className="font-display text-h3 whitespace-nowrap text-neutro-600 transition-colors group-hover/logo:text-ink">
                {s.displayName}
              </span>
              <span className="text-body-s whitespace-nowrap text-ink-2">
                {s.categoryName} · {s.municipalityName}
              </span>
              <span className="sr-only">(sponsorizzato)</span>
            </span>
          </Link>
        </li>
      ))}
      {cta && (
        <li>
          <Link
            href={BOOST_HREF}
            tabIndex={copy ? -1 : undefined}
            className="group/logo mx-4 flex h-16 items-center gap-3 rounded-full bg-subtle px-5 text-body-s font-semibold whitespace-nowrap text-primary transition-colors hover:bg-brand-soft"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface transition-transform duration-200 group-hover/logo:rotate-90">
              <Plus className="size-4" aria-hidden />
            </span>
            Il tuo logo qui
          </Link>
        </li>
      )}
    </ul>
  );
}
