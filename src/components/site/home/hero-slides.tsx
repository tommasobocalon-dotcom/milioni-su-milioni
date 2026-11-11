"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pause, Play } from "lucide-react";
import type { HeroSlide } from "@/lib/data/home-content";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Video a tutto schermo dietro la hero: uno dopo l'altro in dissolvenza, in loop se è uno solo.
 * Fermi (si vede il poster) con "riduci movimento" e con il pulsante pausa (WCAG 2.2.2).
 */
export function HeroSlides({ slides, next, children }: { slides: HeroSlide[]; next: string; children: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const playing = !paused && !reduced;
  const videos = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (!v) return;
      // play() fallisce se il browser blocca l'autoplay: resta il poster.
      if (i === index && playing) v.play().catch(() => {});
      else v.pause();
    });
  }, [index, playing]);

  return (
    <>
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        {slides.map((s, i) => (
          <video
            key={s.video}
            ref={(el) => {
              videos.current[i] = el;
            }}
            src={s.video}
            poster={s.poster}
            muted
            playsInline
            loop={slides.length === 1}
            // Scarica solo il video in corso e il prossimo: parte subito al cambio, senza scaricare gli altri insieme.
            preload={i === index || i === (index + 1) % slides.length ? "auto" : "none"}
            onEnded={() => setIndex((n) => (n + 1) % slides.length)}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-[cubic-bezier(0.33,1,0.68,1)]",
              i === index ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        {/* Velo nero (non verde) solo dove serve leggere il testo bianco: l'unico gradiente ammesso. */}
        <div className="absolute inset-0 bg-black/40 md:bg-[linear-gradient(90deg,rgb(0_0_0/0.55)_0%,rgb(0_0_0/0.3)_50%,rgb(0_0_0/0)_100%)]" /> {/* taste-skill-ignore: velo sul video */}
      </div>

      {children}

      <a
        href={next}
        className="hero-bob absolute bottom-6 left-1/2 z-10 hidden size-11 -translate-x-1/2 items-center justify-center rounded-full text-on-brand transition-colors hover:bg-white/10 md:inline-flex"
      >
        <ChevronDown className="size-7" aria-hidden />
        <span className="sr-only">Scorri alle sezioni</span>
      </a>
      {/* Solo l'icona, senza riquadro: la pausa resta per WCAG 2.2.2 (movimento automatico oltre 5 secondi). */}
      {!reduced && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="absolute right-4 bottom-6 z-10 inline-flex size-10 items-center justify-center rounded-full text-on-brand/70 transition-colors hover:bg-white/10 hover:text-on-brand md:right-6"
        >
          {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
          <span className="sr-only">{playing ? "Ferma il video" : "Riproduci il video"}</span>
        </button>
      )}
    </>
  );
}
