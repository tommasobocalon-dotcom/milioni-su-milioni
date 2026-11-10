"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Schede delle voci di menu che raccolgono più pagine ("La mia attività"). */
const GROUPS = [
  [
    { href: "/area-partner/scheda", label: "Scheda pubblica" },
    { href: "/area-partner/listino", label: "Prezzi" },
  ],
];

export function PartnerTabs() {
  const pathname = usePathname();
  const group = GROUPS.find((g) => g.some((t) => pathname.startsWith(t.href)));
  if (!group) return null;
  return (
    <nav aria-label="Schede" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {group.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-3 text-body font-semibold",
              active ? "border-primary text-primary" : "border-transparent text-ink-2 hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
