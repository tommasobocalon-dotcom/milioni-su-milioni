"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { CategoryPhoto } from "@/lib/data/category-photos";
import { cn } from "@/lib/utils";

export type ShowcaseCategory = {
  id: string;
  pluralName: string;
  href: string;
  partnerCount: number;
  services: string[];
  photo: CategoryPhoto | null;
};

/**
 * "Lavori più richiesti": due nastri di card con foto, il primo scorre da sinistra a destra, il secondo
 * da destra a sinistra. Un clic su una card la ingrandisce come sotto una lente e ferma entrambi i nastri;
 * un secondo clic, Esc o un clic fuori la richiudono e il movimento riparte.
 */
export function CategoryShowcase({ rows }: { rows: [ShowcaseCategory[], ShowcaseCategory[]] }) {
  const [active, setActive] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Aperta col mouse: alla chiusura si toglie anche il focus, altrimenti il nastro resterebbe in pausa.
  const openedByPointer = useRef(false);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openedByPointer.current && rootRef.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      setActive(null);
    };
    const onPointer = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest("[data-card]");
      if (!card || !rootRef.current?.contains(card)) setActive(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [active]);

  const toggle = (key: string, byPointer: boolean) => {
    openedByPointer.current = byPointer;
    setActive((cur) => (cur === key ? null : key));
  };

  return (
    <div ref={rootRef} className="flex flex-col">
      {rows.map((items, row) => (
        <Strip key={row} row={row} items={items} active={active} onToggle={toggle} />
      ))}
    </div>
  );
}

function Strip(props: {
  row: number;
  items: ShowcaseCategory[];
  active: string | null;
  onToggle: (key: string, byPointer: boolean) => void;
}) {
  const { items, active } = props;
  if (items.length === 0) return null;
  // Ogni copia deve essere più larga dello schermo: si ripete la riga finché arriva ad almeno 8 card.
  const strip = Array.from({ length: Math.ceil(8 / items.length) }, () => items).flat();
  return (
    // Il margine verticale lascia spazio alla card ingrandita, che altrimenti verrebbe tagliata.
    <div className="overflow-hidden py-6 motion-reduce:overflow-x-auto">
      <ul
        aria-label={props.row === 0 ? "Categorie, prima riga" : "Categorie, seconda riga"}
        className={cn(
          "flex w-max hover:[animation-play-state:paused] has-[:focus-visible]:[animation-play-state:paused] motion-reduce:animate-none",
          // Prima riga da sinistra a destra, seconda al contrario.
          props.row === 0 ? "animate-[marquee-ltr_50s_linear_infinite]" : "animate-[marquee-rtl_50s_linear_infinite]",
          active && "[animation-play-state:paused]",
        )}
      >
        {[0, 1].map((copy) =>
          strip.map((c, i) => {
            const key = `${props.row}-${copy}-${i}`;
            // Solo la prima ripetizione è letta e raggiungibile da tastiera; le altre servono al ciclo continuo.
            const decorative = copy > 0 || i >= items.length;
            return (
              <li key={key} className={cn("shrink-0 pl-4 sm:pl-5", decorative && "motion-reduce:hidden")} aria-hidden={decorative || undefined}>
                <Card
                  c={c}
                  active={active === key}
                  dimmed={!!active && active !== key}
                  focusable={!decorative}
                  onToggle={(byPointer) => props.onToggle(key, byPointer)}
                />
              </li>
            );
          }),
        )}
      </ul>
    </div>
  );
}

function Card(props: { c: ShowcaseCategory; active: boolean; dimmed: boolean; focusable: boolean; onToggle: (byPointer: boolean) => void }) {
  const { c, active } = props;
  return (
    <div
      data-card
      className={cn(
        "group relative flex h-80 w-60 flex-col overflow-hidden rounded-lg bg-surface transition-[transform,opacity,box-shadow] duration-300 ease-out motion-reduce:transition-none sm:h-88 sm:w-72",
        active ? "z-10 scale-[1.12] shadow-float" : "hover:-translate-y-1",
        props.dimmed && "opacity-50",
      )}
    >
      <button
        type="button"
        onClick={(e) => props.onToggle(e.detail > 0)}
        aria-expanded={active}
        aria-label={`${c.pluralName}: ${active ? "riduci" : "vedi da vicino"}`}
        tabIndex={props.focusable ? 0 : -1}
        className={cn("absolute inset-0 z-10 rounded-lg", active ? "cursor-zoom-out" : "cursor-zoom-in")}
      />
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-subtle transition-[height] duration-300 ease-out motion-reduce:transition-none",
          active ? "h-40 sm:h-48" : "h-52 sm:h-60",
        )}
      >
        {c.photo && (
          <Image
            src={c.photo.src}
            alt={c.photo.alt}
            fill
            sizes="(min-width: 640px) 330px, 270px"
            className={cn(
              "object-cover transition-transform duration-700 ease-out motion-reduce:transition-none",
              active ? "scale-110" : "group-hover:scale-105",
            )}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4 sm:p-5">
        <h3 className="font-display text-h4 sm:text-h3">{c.pluralName}</h3>
        {active ? (
          <>
            {c.services.length > 0 && <p className="line-clamp-3 text-body-s text-ink-2">{c.services.join(" · ")}</p>}
            {/* Il link sta sopra il bottone (z-20): resta cliccabile con la card ingrandita. */}
            <Link
              href={c.href}
              className="relative z-20 mt-auto inline-flex items-center gap-1 self-start text-body-s font-semibold text-primary hover:underline"
            >
              {c.partnerCount === 1 ? "Vedi il partner" : `Vedi i ${c.partnerCount} partner`} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </>
        ) : (
          <p className="text-body-s text-ink-2">{c.partnerCount} partner in Veneto</p>
        )}
      </div>
    </div>
  );
}
