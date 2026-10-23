import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Le taglie tipografiche del brand (text-body, text-h1…) vanno riconosciute come font-size,
// altrimenti tailwind-merge le scambia per colori e scarta text-on-brand e simili.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display-xl", "display-l", "h1", "h2", "h3", "h4", "body-l", "body", "body-s", "caption"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Iniziali per il logo segnaposto di un partner: "Rossi Impianti" → "RI". */
export function initials(name: string): string {
  const words = name
    .replace(/^(arch\.|geom\.|studio tecnico|studio)\s+/i, "")
    .split(/\s+/)
    .filter((w) => /^[A-Za-zÀ-ÿ]/.test(w) && !/^(di|del|della|e|s\.r\.l\.|s\.n\.c\.)$/i.test(w));
  return (words[0]?.[0] ?? "").concat(words[1]?.[0] ?? "").toUpperCase();
}
