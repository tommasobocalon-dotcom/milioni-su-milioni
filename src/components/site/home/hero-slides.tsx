"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, Pause, Play } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export type Slide = { src: string; label: string; caption: string; href: string };

const INTERVAL_MS = 7000;

/**
 * Foto a tutto schermo dietro la hero, in dissolvenza ogni 7 secondi con una lenta deriva (come Thumbtack).
 * Si ferma con "riduci movimento", a scheda nascosta e con il pulsante pausa (WCAG 2.2.2).
 */
export function HeroSlides({ slides, next, children }: { slides: Slide[]; next: string; children: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const playing = slides.length > 1 && !paused && !reduced;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, slides.length]);

  const current = slides[index];

  return (
    <>
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        {slides.map((s, i) => (
          <div
            key={s.src}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1400ms] ease-[cubic-bezier(0.33,1,0.68,1)]",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={s.src}
              alt=""
              fill
              sizes="100vw"
              preload={i === 0}
              loading={i === 0 ? undefined : "lazy"}
              className="hero-drift object-cover"
              style={playing ? undefined : { animationPlayState: "paused" }}
            />
          </div>
        ))}
        {/* Velo neutro sotto il testo, più scuro a sinistra dove sta il titolo: l'unico gradiente ammesso. */}
        <div className="absolute inset-0 bg-neutro-900/55 md:bg-[linear-gradient(90deg,rgb(17_24_20/0.82)_0%,rgb(17_24_20/0.6)_45%,rgb(17_24_20/0.22)_100%)]" /> {/* taste-skill-ignore: velo sulla foto */}
      </div>

      {children}

      <div className="container-page relative z-10 grid items-end gap-4 pb-6 md:grid-cols-[1fr_auto_1fr] md:pb-8">
        <a
          href={next}
          className="hero-bob col-start-2 hidden size-11 items-center justify-center rounded-full text-on-brand transition-colors hover:bg-white/10 md:inline-flex"
        >
          <ChevronDown className="size-7" aria-hidden />
          <span className="sr-only">Scorri alle sezioni</span>
        </a>
        <div className="flex w-full items-start gap-3 rounded-md bg-neutro-900/80 px-4 py-3 text-on-brand md:col-start-3 md:w-auto md:max-w-xs md:justify-self-end">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link href={current.href} className="caps-label underline decoration-1 underline-offset-4 hover:text-salvia-200">
              {current.label}
            </Link>
            <p className="text-body-s text-salvia-100">{current.caption}</p>
          </div>
          {slides.length > 1 && !reduced && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="-mr-1 ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-full text-salvia-100 transition-colors hover:bg-white/10 hover:text-on-brand"
            >
              {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              <span className="sr-only">{playing ? "Ferma le foto" : "Fai scorrere le foto"}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
