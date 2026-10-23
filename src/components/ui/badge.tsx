import { BadgeCheck, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STYLES = {
  verified: "bg-subtle text-primary",
  sponsored: "bg-sponsor text-ink",
  professional: "bg-brand text-on-brand",
  media: "bg-brand-soft text-brand",
  base: "bg-muted text-ink-2",
  new: "bg-info-soft text-info",
} as const;

export type BadgeKind = keyof typeof STYLES;

const LABEL: Record<BadgeKind, string> = {
  verified: "Verificato",
  sponsored: "Sponsorizzato",
  professional: "Professional",
  media: "Media",
  base: "Base",
  new: "Nuovo",
};

/** Componente "Badge" di Figma. "Sponsorizzato" è obbligatorio sui contenuti a pagamento (PRD §7.3). */
export function Badge({ kind, className, children }: { kind: BadgeKind; className?: string; children?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-caption font-medium", STYLES[kind], className)}>
      {kind === "verified" && <BadgeCheck className="size-3.5" aria-hidden />}
      {kind === "sponsored" && <Sparkles className="size-3.5" aria-hidden />}
      {kind === "professional" && <Star className="size-3.5 fill-current" aria-hidden />}
      {children ?? LABEL[kind]}
    </span>
  );
}

export function planBadge(code: string): BadgeKind {
  return code === "professional" ? "professional" : code === "media" ? "media" : "base";
}
