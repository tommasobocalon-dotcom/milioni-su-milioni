import { Award, BadgeCheck, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STYLES = {
  verified: "bg-subtle text-primary",
  sponsored: "bg-sponsor text-ink",
  premium: "bg-ambra-500 text-ink",
  normal: "bg-brand-soft text-brand",
  base: "bg-muted text-ink-2",
  new: "bg-info-soft text-info",
} as const;

export type BadgeKind = keyof typeof STYLES;

const LABEL: Record<BadgeKind, string> = {
  verified: "Verificato",
  sponsored: "Sponsorizzato",
  // Badge dei piani (documento del 4/11/2026; "Partner Pro" al posto di "Professionista Verificato", che si confondeva con "Verificato").
  premium: "Partner Elite",
  normal: "Partner Pro",
  base: "Base",
  new: "Nuovo",
};

/** Componente "Badge" di Figma. "Sponsorizzato" è obbligatorio sui contenuti a pagamento (PRD §7.3). */
export function Badge({
  kind,
  className,
  children,
}: {
  kind: BadgeKind;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 text-caption font-medium",
        STYLES[kind],
        className,
      )}
    >
      {kind === "verified" && <BadgeCheck className="size-3.5" aria-hidden />}
      {kind === "sponsored" && <Sparkles className="size-3.5" aria-hidden />}
      {kind === "premium" && (
        <Star className="size-3.5 fill-current" aria-hidden />
      )}
      {kind === "normal" && <Award className="size-3.5" aria-hidden />}
      {children ?? LABEL[kind]}
    </span>
  );
}

/** Sulle pagine pubbliche il Base non ha etichetta: usare publicPlanBadge. */
export function publicPlanBadge(
  code: string | null | undefined,
): BadgeKind | null {
  return code === "premium" || code === "normal" ? code : null;
}

export function planBadge(code: string): BadgeKind {
  return code === "premium" ? "premium" : code === "normal" ? "normal" : "base";
}
