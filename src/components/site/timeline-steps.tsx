"use client";

import { useEffect, useRef } from "react";

type Step = { title: string; text: string };

/**
 * Barra del tempo dei passi (Chi siamo): quando entra nello schermo la linea si disegna da sola da 1 all'ultimo
 * e accende i cerchi uno dopo l'altro (CSS in globals.css, .timeline). Senza JavaScript o con "riduci movimento"
 * la barra è già completa.
 */
export function TimelineSteps({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Già passata (ritorno con il tasto indietro più in basso nella pagina): resta completa.
    if (el.getBoundingClientRect().bottom < 0) return;
    el.dataset.state = "ready";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.state = "on";
        io.disconnect();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ol ref={ref} className="timeline grid gap-10 lg:grid-cols-4 lg:gap-8">
      {steps.map((step, i) => (
        <li key={step.title} style={{ "--i": i } as React.CSSProperties} className="relative flex flex-col gap-2 pl-16 lg:pt-16 lg:pl-0">
          {i < steps.length - 1 && (
            <span aria-hidden className="absolute top-5 left-[19px] h-[calc(100%+2.5rem)] w-0.5 bg-line lg:top-[19px] lg:left-5 lg:h-0.5 lg:w-[calc(100%+2rem)]">
              <span className="timeline-fill absolute inset-0 origin-top bg-primary lg:origin-left" />
            </span>
          )}
          <span
            aria-hidden
            className="timeline-dot absolute top-0 left-0 z-10 inline-flex size-10 items-center justify-center rounded-full border-2 border-primary bg-primary font-semibold text-on-brand ring-6 ring-page"
          >
            {i + 1}
          </span>
          <h3 className="pt-2 text-h4 font-semibold lg:pt-0">{step.title}</h3>
          <p className="text-body-s text-ink-2">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
