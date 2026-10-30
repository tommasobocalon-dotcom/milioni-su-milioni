"use client";

import { useEffect, useState } from "react";
import { MapPin, Search } from "lucide-react";

/** Ricerche di esempio scritte una lettera alla volta nella barra finta del primo blocco in Home. */
const EXAMPLES: [what: string, where: string][] = [
  ["rifare il bagno", "Padova"],
  ["certificato APE", "Mestre"],
  ["vendere casa", "Treviso"],
  ["impianto elettrico", "Vicenza"],
];

const TYPE_MS = 70;
const HOLD_MS = 1600;

/**
 * Barra di ricerca dimostrativa (non è un modulo: quello vero sta in cima alla pagina). Con "riduci movimento"
 * resta ferma sul primo esempio.
 */
export function SearchDemo() {
  const [step, setStep] = useState({ example: 0, chars: Infinity });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Si parte dal primo esempio già scritto (lo stesso dell'HTML statico), poi si passa al successivo.
    let example = 0;
    let chars = EXAMPLES[0][0].length + EXAMPLES[0][1].length;
    let timer: number;
    const tick = () => {
      const [what, where] = EXAMPLES[example];
      const total = what.length + where.length;
      if (chars < total) {
        chars++;
        setStep({ example, chars });
        timer = window.setTimeout(tick, chars === what.length ? 350 : TYPE_MS);
      } else {
        timer = window.setTimeout(() => {
          example = (example + 1) % EXAMPLES.length;
          chars = 0;
          setStep({ example, chars });
          timer = window.setTimeout(tick, 400);
        }, HOLD_MS);
      }
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const [what, where] = EXAMPLES[step.example];
  const typedWhat = what.slice(0, step.chars);
  const typedWhere = where.slice(0, Math.max(0, step.chars - what.length));
  const caretOnWhere = step.chars > what.length;

  return (
    <div data-ui aria-hidden="true" className="flex flex-col gap-2 rounded-lg bg-surface p-2 text-ink shadow-float sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3 px-3 py-1.5">
        <Search className="size-5 shrink-0 text-ink-2" />
        <div className="flex min-w-0 flex-col">
          <span className="text-caption font-semibold text-ink-2">Cosa ti serve?</span>
          <span className="min-h-6 truncate text-body">
            {typedWhat}
            {!caretOnWhere && <span className="demo-cursore" />}
          </span>
        </div>
      </div>
      <div className="flex flex-1 items-center gap-3 px-3 py-1.5 sm:max-w-44">
        <MapPin className="size-5 shrink-0 text-ink-2" />
        <div className="flex min-w-0 flex-col">
          <span className="text-caption font-semibold text-ink-2">Dove?</span>
          <span className="min-h-6 truncate text-body">
            {typedWhere}
            {caretOnWhere && <span className="demo-cursore" />}
          </span>
        </div>
      </div>
      <span className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 font-semibold text-on-brand">
        Cerca <Search className="size-4" />
      </span>
    </div>
  );
}
