import Image from "next/image";
import { cn } from "@/lib/utils";

/** La mascotte, con l'outfit di ogni sezione (PRD §11.2). */
const OUTFITS = {
  saluto: "Il geco, la guida del sito, che saluta",
  casa: "Il geco con giacca da agente immobiliare e mazzo di chiavi",
  professionista: "Il geco con casco giallo e cassetta degli attrezzi",
  recensioni: "Il geco con lente d'ingrandimento e stella",
  partner: "Il geco consulente con tablet",
  token: "Il geco con un razzo",
  errore: "Il geco aggrappato a un muro crepato",
  pensa: "Il geco pensieroso",
  arrampicata: "Il geco che si arrampica",
} as const;

export type GecoOutfit = keyof typeof OUTFITS;

type Layer = { src: string; animation?: string; origin?: [number, number]; delay?: string };

/*
 * Ogni posa ha la sua animazione, ferma con "riduci movimento".
 * Le pose che muovono un braccio sono WebP animati (public/geco/anim, generati da design/geco/anima.mjs):
 * il braccio si piega alla giuntura invece di essere un pezzo staccato che ruota sopra il corpo.
 * Il razzo usa strati della stessa misura (design/geco/parti, da split_parti.py): corpo + monete che ruotano
 * attorno al perno (origin, 0–1). Le altre pose si muovono per intero (classi in globals.css).
 */
const ANIMATED = new Set<GecoOutfit>(["saluto", "casa", "professionista", "partner", "recensioni"]);

const LAYERS: Partial<Record<GecoOutfit, Layer[]>> = {
  token: [
    { src: "token-corpo", animation: "geco-razzo", origin: [0.5, 0.6] },
    { src: "token-moneta1", animation: "geco-moneta", origin: [0.095, 0.66] },
    { src: "token-moneta2", animation: "geco-moneta", origin: [0.185, 0.75], delay: "-1.2s" },
  ],
};

const WHOLE: Partial<Record<GecoOutfit, string>> = {
  errore: "geco-aggrappato",
  pensa: "geco-pensa",
  arrampicata: "geco-arrampica",
};

export function Geco({
  outfit,
  size = 160,
  decorative = true,
  className,
  priority,
  still,
}: {
  outfit: GecoOutfit;
  size?: number;
  decorative?: boolean;
  className?: string;
  priority?: boolean;
  /** Mostra la mascotte ferma, senza animazione (usa il fotogramma fermo). */
  still?: boolean;
}) {
  if (ANIMATED.has(outfit)) {
    if (still) {
      // niente animazione: solo il fotogramma fermo (lo stesso usato per "riduci movimento")
      return (
        <img
          src={`/geco/anim/${outfit}-fermo.webp?v=2`}
          alt={decorative ? "" : OUTFITS[outfit]}
          width={size}
          height={size}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className={cn("select-none", className)}
        />
      );
    }
    return (
      // contents: misure e classi stanno sull'<img>, come con <Image>
      <picture className="contents">
        <source srcSet={`/geco/anim/${outfit}-fermo.webp?v=2`} media="(prefers-reduced-motion: reduce)" />
        {/* WebP animato: l'ottimizzatore di next/image lo servirebbe così com'è, e <picture> serve per il fermo immagine */}
        <img
          src={`/geco/anim/${outfit}.webp?v=2`}
          alt={decorative ? "" : OUTFITS[outfit]}
          width={size}
          height={size}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className={cn("select-none", className)}
        />
      </picture>
    );
  }
  const layers = LAYERS[outfit];
  if (!layers) {
    return (
      <Image
        src={`/geco/${outfit}.png`}
        alt={decorative ? "" : OUTFITS[outfit]}
        width={size}
        height={size}
        priority={priority}
        className={cn("select-none", WHOLE[outfit], className)}
      />
    );
  }
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : OUTFITS[outfit]}
      aria-hidden={decorative || undefined}
      className={cn("relative inline-block shrink-0 select-none", className)}
      style={{ width: size, height: size }}
    >
      {layers.map((layer) => (
        <Image
          key={layer.src}
          src={`/geco/parti/${layer.src}.webp`}
          alt=""
          width={size}
          height={size}
          priority={priority}
          className={cn("absolute inset-0 size-full", layer.animation)}
          style={{
            transformOrigin: layer.origin && `${layer.origin[0] * 100}% ${layer.origin[1] * 100}%`,
            animationDelay: layer.delay,
          }}
        />
      ))}
    </span>
  );
}
