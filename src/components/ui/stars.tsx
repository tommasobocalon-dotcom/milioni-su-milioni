import { Star } from "lucide-react";
import { formatRating } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-star", className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i <= Math.round(value) ? "fill-current" : "fill-transparent text-neutro-300"}
        />
      ))}
    </span>
  );
}

/** Componente "Valutazione" di Figma: stelle, voto e numero di recensioni. */
export function Rating({ average, count, className }: { average: number; count: number; className?: string }) {
  if (count === 0) return <span className={cn("text-body-s text-ink-2", className)}>Nessuna recensione</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-body-s", className)}>
      <Stars value={average} />
      <span className="font-semibold text-ink">{formatRating(average)}</span>
      <span className="text-ink-2">({count.toLocaleString("it-IT")} recensioni)</span>
      <span className="sr-only">Valutazione {formatRating(average)} su 5</span>
    </span>
  );
}
