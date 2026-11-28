import { Suspense } from "react";
import { AdminSidebar, SectionTabs } from "@/components/admin/sidebar";
import { AdminSkeleton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { countTicketsByStatus } from "@/lib/data/support";

/** Numero di ticket da rispondere accanto ad "Assistenza". */
async function OpenTicketsBadge() {
  const { open } = await countTicketsByStatus();
  if (!open) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ambra-500 px-1.5 text-caption font-bold text-ink" aria-label={`${open} da rispondere`}>
      {open}
    </span>
  );
}

/** Niente del gestionale, nemmeno il menu, si mostra prima di sapere che chi guarda è un amministratore. */
async function AdminShell({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar
        siteHref={process.env.ADMIN_URL ? (process.env.APP_URL ?? "/") : "/"}
        ticketBadge={
          <Suspense fallback={null}>
            <OpenTicketsBadge />
          </Suspense>
        }
      />
      <main id="contenuto" className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <Suspense fallback={null}>
          <SectionTabs />
        </Suspense>
        {children}
      </main>
    </div>
  );
}

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-6 sm:px-8 lg:py-8">
          <AdminSkeleton />
        </div>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
