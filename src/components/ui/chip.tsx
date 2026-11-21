import Link from "next/link";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const base =
  // min-h e py: un'etichetta lunga va a capo dentro il chip invece di uscire dal bordo (filtri stretti di Trova Casa).
  "inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-body-s leading-snug font-medium transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0";
const on = "border-salvia-500 bg-brand-soft text-brand";
const off = "border-line bg-surface text-ink hover:border-line-strong";

/** Componente "Chip filtro" di Figma, come link (filtri in URL) o come etichetta statica. */
export function ChipLink({ selected, className, children, ...props }: ComponentProps<typeof Link> & { selected?: boolean }) {
  return (
    <Link aria-current={selected ? "true" : undefined} className={cn(base, selected ? on : off, className)} {...props}>
      {selected && <Check aria-hidden />}
      {children}
    </Link>
  );
}

export function Chip({ selected, className, children }: { selected?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn(base, selected ? on : off, className)}>
      {selected && <Check aria-hidden />}
      {children}
    </span>
  );
}
