import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logo GecoItalia: solo la scritta in Unbounded, nel colore del brand; sugli sfondi scuri passare `text-on-brand` in `className`. */
export function Wordmark({ href = "/", label = "GecoItalia, vai alla home", className }: { href?: string; label?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex shrink-0 font-wordmark text-2xl font-extrabold tracking-[-0.01em] text-brand", className)} aria-label={label}>
      <span aria-hidden>GECOITALIA</span>
    </Link>
  );
}
