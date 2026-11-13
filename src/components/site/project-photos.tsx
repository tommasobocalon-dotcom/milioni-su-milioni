"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowButton } from "@/components/site/project-gallery";

/**
 * Foto di un progetto nel suo riquadro 4:3: una sola foto ferma, più foto in una fila che si scorre di lato
 * (scroll-snap, col dito o con le frecce; con la tastiera si scorre con le frecce dopo il Tab).
 * Con `href` ogni foto è anche un link (in Ispirazione apre la pagina del lavoro).
 */
export function ProjectPhotos({ photos, title, sizes, href }: { photos: string[]; title: string; sizes: string; href?: string }) {
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function photo(src: string, alt: string) {
    const img = <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />;
    return href ? (
      <Link href={href} tabIndex={-1} className="absolute inset-0">
        {img}
      </Link>
    ) : (
      img
    );
  }

  if (photos.length === 1) return photo(photos[0], title);

  function go(i: number) {
    const el = strip.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <>
      <div
        ref={strip}
        role="region"
        tabIndex={0}
        aria-label={`${title}: ${photos.length} foto, scorri di lato`}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {photos.map((src, i) => (
          <div key={src} className="relative h-full w-full shrink-0 snap-start">
            {photo(src, `${title}, foto ${i + 1} di ${photos.length}`)}
          </div>
        ))}
      </div>
      <ArrowButton side="left" disabled={index === 0} onClick={() => go(index - 1)} />
      <ArrowButton side="right" disabled={index === photos.length - 1} onClick={() => go(index + 1)} />
      <span className="pointer-events-none absolute right-2 bottom-2 rounded-full bg-ink/75 px-2 py-0.5 text-caption font-semibold text-on-brand">
        <span className="sr-only">{photos.length} foto</span>
        <span aria-hidden>
          {index + 1} / {photos.length}
        </span>
      </span>
    </>
  );
}
