import Link from "next/link";
import { Geco } from "@/components/site/geco";
import { cn } from "@/lib/utils";

export function Wordmark({ inverted, className }: { inverted?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2", className)} aria-label="geco, vai alla home">
      <span
        className={cn(
          "inline-flex size-9 items-center justify-center overflow-hidden rounded-full",
          inverted ? "bg-bosco-800" : "bg-brand-soft",
        )}
      >
        <Geco outfit="saluto" size={36} className="translate-y-0.5 scale-125" />
      </span>
      <span className={cn("font-display text-h3 leading-none", inverted ? "text-on-brand" : "text-brand")}>geco</span>
    </Link>
  );
}
