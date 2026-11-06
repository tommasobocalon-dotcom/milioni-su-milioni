import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logo GecoItalia orizzontale (casa con geco + scritta); `inverted` per gli sfondi scuri. */
export function Wordmark({ inverted, href = "/", label = "GecoItalia, vai alla home", className }: { inverted?: boolean; href?: string; label?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label={label}>
      <Image
        src={inverted ? "/logo/gecoitalia-orizzontale-chiaro.png" : "/logo/gecoitalia-orizzontale.png"}
        alt=""
        width={685}
        height={160}
        priority
        className="h-10 w-auto"
      />
    </Link>
  );
}
