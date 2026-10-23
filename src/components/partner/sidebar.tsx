"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Building2, Coins, CreditCard, Images, Inbox, Landmark, LayoutDashboard, LogOut } from "lucide-react";
import { logout } from "@/app/accedi/actions";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/area-partner", label: "Panoramica", icon: LayoutDashboard },
  { href: "/area-partner/lead", label: "Lead", icon: Inbox },
  { href: "/area-partner/scheda", label: "La mia scheda", icon: Building2 },
  { href: "/area-partner/listino", label: "Listino prezzi", icon: Landmark },
  { href: "/area-partner/portfolio", label: "Portfolio", icon: Images },
  { href: "/area-partner/statistiche", label: "Statistiche", icon: BarChart3 },
  { href: "/area-partner/token", label: "Token e boost", icon: Coins },
  { href: "/area-partner/abbonamento", label: "Abbonamento", icon: CreditCard },
  { href: "/area-partner/notifiche", label: "Notifiche", icon: Bell },
];

function NavList({ pathname }: { pathname: string | null }) {
  const active = (href: string) => !!pathname && (href === "/area-partner" ? pathname === href : pathname.startsWith(href));
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => (
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
        </Link>
      ))}
    </>
  );
}

function ActiveNavList() {
  return <NavList pathname={usePathname()} />;
}

/** Componente "Sidebar partner" di Figma; su telefono diventa una barra di schede scorrevole. */
export function PartnerSidebar() {
  return (
    <aside className="flex shrink-0 flex-col bg-brand text-on-brand lg:sticky lg:top-0 lg:h-screen lg:w-64">
      <div className="flex items-center justify-between px-4 py-4 lg:px-5 lg:py-6">
        <Link href="/" className="inline-flex items-center gap-2" aria-label="geco, sito pubblico">
          <span className="inline-flex size-9 items-center justify-center overflow-hidden rounded-full bg-bosco-800">
            <Image src="/geco/saluto.png" alt="" width={36} height={36} className="translate-y-0.5 scale-125" />
          </span>
          <span className="font-display text-h3 leading-none">geco</span>
        </Link>
        <form action={logout} className="lg:hidden">
          <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-body-s text-on-brand-muted hover:text-on-brand">
            <LogOut className="size-4" aria-hidden /> Esci
          </button>
        </form>
      </div>
      <nav aria-label="Area Partner" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4">
        {/* L'URL è un dato della richiesta: la voce attiva arriva dentro un Suspense. */}
        <Suspense fallback={<NavList pathname={null} />}>
          <ActiveNavList />
        </Suspense>
      </nav>
      <div className="hidden flex-col gap-3 p-4 lg:flex">
        <div className="flex items-center gap-3 rounded-lg bg-bosco-800 p-3">
          <Image src="/geco/partner.png" alt="" width={44} height={44} />
          <div className="text-body-s">
            <p className="font-semibold">Serve aiuto?</p>
            <p className="text-caption text-on-brand-muted">Il geco (assistente IA) arriva presto</p>
          </div>
        </div>
        <form action={logout}>
          <button className="inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-s text-on-brand-muted hover:bg-bosco-800 hover:text-on-brand">
            <LogOut className="size-4" aria-hidden /> Esci
          </button>
        </form>
      </div>
    </aside>
  );
}
