import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { LogoPartner } from "@/components/ui/logo-partner";
import { getHomeSponsors, type HomeSponsor } from "@/lib/data/home";
import { cn } from "@/lib/utils";

/** Loghi minimi per metà nastro: con poche aziende la fila si ripete, così il nastro riempie lo schermo e scorre sempre. */
const MIN_PER_HALF = 8;

/**
 * Fascia divisoria con i loghi delle aziende in evidenza: partner con un boost pagato a token in corso.
 * Sempre etichettata "Sponsorizzato" (PRD §7.3, Omnibus/P2B). Dati letti a ogni richiesta: va in <Suspense>.
 */
export async function SponsorStrip() {
  const sponsors = await getHomeSponsors();
  const repeat =
    sponsors.length > 0 ? Math.ceil(MIN_PER_HALF / sponsors.length) : 0;

  return (
    <section
      aria-labelledby="in-evidenza"
      className="bg-surface py-20 md:py-24"
    >
      <div
        data-reveal
        className="container-page flex flex-col items-center gap-3 text-center"
      >
        <p className="caps-label inline-flex h-6 items-center rounded-full bg-sponsor px-2.5 text-ink">
          Sponsorizzato
        </p>
        <h2
          id="in-evidenza"
          className="font-display text-[2.25rem] leading-tight tracking-[-0.02em] md:text-display-l"
        >
          Aziende in evidenza
        </h2>
        <p className="max-w-xl text-body text-neutro-700">
          {sponsors.length > 0
            ? "Partner che hanno scelto più visibilità con i token. I posti a pagamento sono sempre segnalati come tali."
            : "Qui compaiono le aziende che scelgono più visibilità con i token. Il posto è libero: può essere il tuo."}
        </p>
      </div>

      {sponsors.length > 0 && (
        <div data-reveal className="mt-10 overflow-hidden md:mt-12">
          {/* Due metà uguali (l'animazione sposta di -50%): la prima fila è quella leggibile, le altre sono copie nascoste
              ai lettori di schermo. Con "riduci movimento" resta solo la prima fila, ferma. */}
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
        </div>
      )}

      <div
        data-reveal
        className="container-page mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-body-s"
      >
        <Link
          href="/come-funziona#sponsorizzati"
          className="font-semibold text-ink-2 underline underline-offset-4 hover:text-ink"
        >
          Come funzionano i contenuti sponsorizzati
        </Link>
        <Link
          href="/per-i-professionisti"
          className="group/link inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary-hover"
        >
          Metti in evidenza la tua azienda
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover/link:translate-x-1"
            aria-hidden
          />
        </Link>
      </div>
    </section>
  );
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
            aria-label={`${s.displayName}, ${s.categoryName.toLowerCase()} a ${s.municipalityName} (sponsorizzato)`}
            className="group/logo flex h-24 items-center gap-3.5 rounded-lg px-6 transition-colors hover:bg-page md:px-8"
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
            </span>
          </Link>
        </li>
      ))}
      {cta && (
        <li>
          <Link
            href="/per-i-professionisti"
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
