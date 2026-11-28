"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Inbox, LayoutDashboard, LifeBuoy, LogOut, Settings, Store } from "lucide-react";
import { logoutAdmin } from "@/app/admin/actions";
import { Wordmark } from "@/components/site/wordmark";
import { cn } from "@/lib/utils";

/**
 * Menu del gestionale in 5 voci (27/11/2026, prima 10): le pagine vicine stanno sotto la stessa voce e si
 * raggiungono dalle schede in cima alla pagina (SectionTabs).
 */
const SECTIONS = [
  { href: "/admin", label: "Da fare", icon: LayoutDashboard, tabs: [] },
  { href: "/admin/assistenza", label: "Assistenza", icon: LifeBuoy, badge: true, tabs: [] },
  {
    href: "/admin/partner",
    label: "Aziende",
    icon: Store,
    tabs: [
      { href: "/admin/partner", label: "Elenco" },
      { href: "/admin/abbonamenti", label: "Abbonamenti" },
      { href: "/admin/sponsorizzazioni", label: "Sponsorizzazioni" },
    ],
  },
  { href: "/admin/richieste", label: "Richieste clienti", icon: Inbox, tabs: [] },
  {
    href: "/admin/zone",
    label: "Impostazioni",
    icon: Settings,
    tabs: [
      { href: "/admin/zone", label: "Zone" },
      { href: "/admin/categorie", label: "Categorie" },
      { href: "/admin/registro", label: "Registro attività" },
    ],
  },
];

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
const sectionOf = (pathname: string | null) =>
  pathname ? SECTIONS.find((s) => (s.tabs.length ? s.tabs.some((t) => under(pathname, t.href)) : s.href === "/admin" ? pathname === s.href : under(pathname, s.href))) : undefined;

function NavList({ pathname, badge }: { pathname: string | null; badge: React.ReactNode }) {
  const current = sectionOf(pathname);
  return (
    <>
      {SECTIONS.map(({ href, label, icon: Icon, badge: hasBadge }) => (
        <Link
          key={href}
          href={href}
          aria-current={current?.href === href ? "page" : undefined}
          className={cn(
            "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-body-s font-medium",
            current?.href === href ? "bg-bosco-600 text-on-brand" : "text-on-brand-muted hover:bg-bosco-700 hover:text-on-brand",
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

/** Schede della voce di menu aperta (Aziende, Impostazioni), in cima al contenuto. */
export function SectionTabs() {
  const pathname = usePathname();
  const tabs = sectionOf(pathname)?.tabs ?? [];
  if (!tabs.length) return null;
  return (
    <nav aria-label="Sezione" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const active = under(pathname, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-body-s font-semibold",
              active ? "border-primary text-ink" : "border-transparent text-ink-2 hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
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
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <Wordmark className="text-xl text-on-brand" href="/admin" label="Gestionale GecoItalia, panoramica" />
          <span className="text-body-s font-semibold text-on-brand-muted">Gestionale</span>
        </span>
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
        <a href={siteHref} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-body-s text-on-brand-muted hover:bg-bosco-700 hover:text-on-brand">
          <Globe className="size-4" aria-hidden /> Vai al sito
        </a>
        <form action={logoutAdmin}>
          <button className="inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-s text-on-brand-muted hover:bg-bosco-700 hover:text-on-brand">
            <LogOut className="size-4" aria-hidden /> Esci
          </button>
        </form>
      </div>
    </aside>
  );
}
