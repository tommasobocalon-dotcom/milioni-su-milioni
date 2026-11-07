import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logo GecoItalia verticale (casa con geco, scritta sotto); `inverted` per gli sfondi scuri. */
export function Wordmark({ inverted, href = "/", label = "GecoItalia, vai alla home", className }: { inverted?: boolean; href?: string; label?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label={label}>
      <Image
        src={inverted ? "/logo/gecoitalia-chiaro.png" : "/logo/gecoitalia.png"}
        alt=""
        width={790}
        height={523}
        priority
        className="h-14 w-auto"
      />
    </Link>
  );
}
