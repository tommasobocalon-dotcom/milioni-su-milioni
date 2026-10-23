import { cn, initials } from "@/lib/utils";

/** Componente "Logo partner": finché il partner non carica il logo mostra le iniziali. */
export function LogoPartner({ name, size = 56, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-brand-soft font-display font-semibold text-brand",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
