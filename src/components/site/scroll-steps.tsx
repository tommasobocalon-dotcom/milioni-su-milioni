"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { CategoryPhoto } from "@/lib/data/category-photos";

type Step = { title: string; text: string; photo: CategoryPhoto };

/**
 * Passi di "Come funziona" in una striscia orizzontale, sul modello dei siti Awwwards con lo scroll orizzontale:
 * da 1024px la sezione resta ferma e, scendendo con la pagina, la striscia delle foto scorre da destra a sinistra.
 * Sotto i 1024px, con "riduci movimento" o senza JavaScript è una normale striscia da scorrere col dito.
 */
export function ScrollSteps({ heading, steps }: { heading: React.ReactNode; steps: Step[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = outer.current;
    const strip = track.current;
    if (!el || !strip) return;
    const wide = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    let frame = 0;

    const layout = () => {
      if (!wide.matches) {
        el.style.height = "";
        strip.style.transform = "";
        el.dataset.pinned = "false";
        return;
      }
      el.dataset.pinned = "true";
      // Quanto la striscia sporge oltre lo schermo = quanto scroll in più serve per mostrarla tutta.
      const extra = Math.max(0, strip.scrollWidth - strip.clientWidth);
      el.style.height = `${window.innerHeight + extra}px`;
      update();
    };
    const update = () => {
      frame = 0;
      if (!wide.matches) return;
      const extra = el.offsetHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / Math.max(1, extra)));
      strip.style.transform = `translate3d(${-progress * extra}px,0,0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    layout();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", layout);
    wide.addEventListener("change", layout);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", layout);
      wide.removeEventListener("change", layout);
    };
  }, []);

  return (
    <div ref={outer} data-pinned="false" className="group/pin relative">
      <div className="flex flex-col justify-center gap-10 py-24 group-data-[pinned=true]/pin:sticky group-data-[pinned=true]/pin:top-0 group-data-[pinned=true]/pin:h-svh group-data-[pinned=true]/pin:overflow-hidden group-data-[pinned=true]/pin:py-0 md:py-32">
        <div className="container-page">{heading}</div>
        <ol
          ref={track}
          // Si scorre anche con le frecce della tastiera (WCAG 2.1.1).
          tabIndex={0}
          className="flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] will-change-transform sm:scroll-px-8 sm:px-8 lg:gap-8 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary group-data-[pinned=true]/pin:overflow-visible group-data-[pinned=true]/pin:pb-0"
        >
          {steps.map((s, i) => (
            <li key={s.title} className="flex w-[82vw] shrink-0 snap-start flex-col gap-5 sm:w-[24rem] lg:w-[30rem]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl lg:aspect-[5/4]">
                <Image src={s.photo.src} alt={s.photo.alt} fill sizes="(min-width: 1024px) 30rem, 82vw" className="object-cover object-[center_20%]" />
              </div>
              <div className="flex flex-col gap-2 pr-4">
                <span aria-hidden className="font-display text-[3.5rem] leading-none tracking-[-0.04em] text-primary">
                  {i + 1}
                </span>
                <h3 className="font-display text-h2">{s.title}</h3>
                <p className="text-body-l">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
