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

export function Geco({
  outfit,
  size = 160,
  decorative = true,
  className,
  priority,
}: {
  outfit: GecoOutfit;
  size?: number;
  decorative?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={`/geco/${outfit}.png`}
      alt={decorative ? "" : OUTFITS[outfit]}
      width={size}
      height={size}
      priority={priority}
      className={cn("select-none", className)}
    />
  );
}
