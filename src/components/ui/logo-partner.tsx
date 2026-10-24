import Image from "next/image";
import { cn, initials } from "@/lib/utils";

/** Componente "Logo partner": la foto profilo caricata, altrimenti le iniziali. */
export function LogoPartner({ name, src, size = 56, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  if (src) {
    return <Image src={src} alt="" unoptimized={src.startsWith("blob:")} width={size} height={size} style={{ width: size, height: size }} className={cn("shrink-0 rounded-md object-cover", className)} />;
  }
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
