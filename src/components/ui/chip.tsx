import Link from "next/link";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const base =
  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-body-s font-medium transition-colors [&_svg]:size-3.5";
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
