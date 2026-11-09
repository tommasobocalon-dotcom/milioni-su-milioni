"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Coins, House, Inbox, LifeBuoy, LogOut, UserRound } from "lucide-react";
import { logoutBusiness } from "@/app/accedi/actions";
import { Wordmark } from "@/components/site/wordmark";
import { cn } from "@/lib/utils";

/** Menu ridotto a 6 voci: le pagine collegate stanno sotto la stessa voce (schede in `PartnerTabs`). */
const NAV = [
  { href: "/area-partner", label: "Home", icon: House, also: ["/area-partner/statistiche", "/area-partner/notifiche"] },
  { href: "/area-partner/lead", label: "Richieste clienti", icon: Inbox, also: [] },
  { href: "/area-partner/scheda", label: "La mia attività", icon: Building2, also: ["/area-partner/listino"] },
  { href: "/area-partner/profilo", label: "Profilo", icon: UserRound, also: [] },
  { href: "/area-partner/abbonamento", label: "Piano e crediti", icon: Coins, also: ["/area-partner/token"] },
  { href: "/area-partner/assistenza", label: "Aiuto", icon: LifeBuoy, also: [] },
];

function NavList({ pathname }: { pathname: string | null }) {
  const active = (href: string, also: string[]) =>
    !!pathname && ((href === "/area-partner" ? pathname === href : pathname.startsWith(href)) || also.some((a) => pathname.startsWith(a)));
  return (
    <>
      {NAV.map(({ href, label, icon: Icon, also }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href, also) ? "page" : undefined}
          className={cn(
            "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-body-s font-medium",
            active(href, also) ? "bg-bosco-600 text-on-brand" : "text-on-brand-muted hover:bg-bosco-700 hover:text-on-brand",
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
export function PartnerSidebar({ bell }: { bell: React.ReactNode }) {
  return (
    <aside className="flex shrink-0 flex-col bg-brand text-on-brand lg:sticky lg:top-0 lg:h-screen lg:w-64">
      <div className="flex items-center justify-between px-4 py-4 lg:px-5 lg:py-6">
        <Wordmark className="text-xl text-on-brand" label="GecoItalia, sito pubblico" />
        <div className="flex items-center gap-1">
          {bell}
          <form action={logoutBusiness} className="lg:hidden">
            <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-body-s text-on-brand-muted hover:text-on-brand">
              <LogOut className="size-4" aria-hidden /> Esci
            </button>
          </form>
        </div>
      </div>
      <nav aria-label="Area Partner" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4">
        {/* L'URL è un dato della richiesta: la voce attiva arriva dentro un Suspense. */}
        <Suspense fallback={<NavList pathname={null} />}>
          <ActiveNavList />
        </Suspense>
      </nav>
      <div className="hidden p-4 lg:block">
        <form action={logoutBusiness}>
          <button className="inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-s text-on-brand-muted hover:bg-bosco-700 hover:text-on-brand">
            <LogOut className="size-4" aria-hidden /> Esci
          </button>
        </form>
      </div>
    </aside>
  );
}
