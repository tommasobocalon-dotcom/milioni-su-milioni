"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Galleria della pagina di un lavoro: foto grande che si scorre di lato (scroll-snap, anche col dito o con le frecce
 * della tastiera dopo il Tab), frecce, contatore "2 / 8" e miniature sotto.
 */
export function ProjectGallery({ photos, title }: { photos: string[]; title: string }) {
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const many = photos.length > 1;

  function go(i: number) {
    const el = strip.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted md:aspect-[16/9]">
        <div
          ref={strip}
          role="region"
          tabIndex={0}
          aria-label={`${title}: ${photos.length} foto${many ? ", scorri di lato" : ""}`}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary"
        >
          {photos.map((src, i) => (
            <div key={src} className="relative h-full w-full shrink-0 snap-start">
              <Image
                src={src}
                alt={`${title}, foto ${i + 1} di ${photos.length}`}
                fill
                priority={i === 0}
                sizes="(min-width: 1280px) 1200px, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {many && (
          <>
            <ArrowButton side="left" disabled={index === 0} onClick={() => go(index - 1)} />
            <ArrowButton side="right" disabled={index === photos.length - 1} onClick={() => go(index + 1)} />
            <span aria-hidden className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-ink/75 px-2.5 py-0.5 text-body-s font-semibold text-on-brand">
              {index + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      {many && (
        <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {photos.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Mostra la foto ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative block h-16 w-24 overflow-hidden rounded-md border-2 md:h-20 md:w-28",
                  i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image src={src} alt="" fill sizes="112px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ArrowButton({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Foto precedente" : "Foto successiva"}
      className={cn(
        "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface/90 text-ink transition-opacity hover:bg-surface disabled:pointer-events-none disabled:opacity-0",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
