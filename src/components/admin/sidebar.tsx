"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flag, Globe, LayoutDashboard, LifeBuoy, LogOut, ScrollText, Star, Store } from "lucide-react";
import { logoutAdmin } from "@/app/admin/actions";
import { Geco } from "@/components/site/geco";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Panoramica", icon: LayoutDashboard },
  { href: "/admin/assistenza", label: "Assistenza", icon: LifeBuoy, badge: true },
  { href: "/admin/partner", label: "Partner", icon: Store },
  { href: "/admin/segnalazioni", label: "Segnalazioni lead", icon: Flag },
  { href: "/admin/recensioni", label: "Recensioni", icon: Star },
  { href: "/admin/registro", label: "Registro attività", icon: ScrollText },
];

function NavList({ pathname, badge }: { pathname: string | null; badge: React.ReactNode }) {
  const active = (href: string) => !!pathname && (href === "/admin" ? pathname === href : pathname.startsWith(href));
  return (
    <>
      {NAV.map(({ href, label, icon: Icon, badge: hasBadge }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className={cn(
            "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-body-s font-medium",
            active(href) ? "bg-primary text-on-brand" : "text-on-brand-muted hover:bg-bosco-800 hover:text-on-brand",
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
          {label}
          {hasBadge && badge}
        </Link>
      ))}
    </>
  );
}

function ActiveNavList({ badge }: { badge: React.ReactNode }) {
  return <NavList pathname={usePathname()} badge={badge} />;
}

/** Barra del Backoffice, come la sidebar partner; su telefono diventa una fila di schede scorrevole. */
export function AdminSidebar({ ticketBadge, siteHref }: { ticketBadge: React.ReactNode; siteHref: string }) {
  return (
    <aside className="flex shrink-0 flex-col bg-brand text-on-brand lg:sticky lg:top-0 lg:h-screen lg:w-64">
      <div className="flex items-center justify-between px-4 py-4 lg:px-5 lg:py-6">
        <Link href="/admin" className="inline-flex items-center gap-2" aria-label="Gestionale geco, panoramica">
          <span className="inline-flex size-9 items-center justify-center overflow-hidden rounded-full bg-bosco-800">
            <Geco outfit="partner" size={36} className="translate-y-0.5 scale-125" />
          </span>
          <span className="flex flex-col">
            <span className="font-display text-h3 leading-none">geco</span>
            <span className="text-caption text-on-brand-muted">Gestionale</span>
          </span>
        </Link>
        <form action={logoutAdmin} className="lg:hidden">
          <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-body-s text-on-brand-muted hover:text-on-brand">
            <LogOut className="size-4" aria-hidden /> Esci
          </button>
        </form>
      </div>
      <nav aria-label="Gestionale" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4">
        <Suspense fallback={<NavList pathname={null} badge={null} />}>
          <ActiveNavList badge={ticketBadge} />
        </Suspense>
      </nav>
      <div className="hidden flex-col gap-1 p-4 lg:flex">
        <a href={siteHref} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-body-s text-on-brand-muted hover:bg-bosco-800 hover:text-on-brand">
          <Globe className="size-4" aria-hidden /> Vai al sito
        </a>
        <form action={logoutAdmin}>
          <button className="inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-s text-on-brand-muted hover:bg-bosco-800 hover:text-on-brand">
            <LogOut className="size-4" aria-hidden /> Esci
          </button>
        </form>
      </div>
    </aside>
  );
}
