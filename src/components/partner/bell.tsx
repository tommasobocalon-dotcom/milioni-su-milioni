import Link from "next/link";
import { Bell } from "lucide-react";
import { requirePartner } from "@/lib/auth/session";
import { countLeadsByStatus } from "@/lib/data/partner-area";

export function BellLink({ unread }: { unread: number }) {
  return (
    <Link
      href="/area-partner/notifiche"
      aria-label={unread ? `Posta in arrivo, ${unread} da leggere` : "Posta in arrivo"}
      className="relative inline-flex size-9 items-center justify-center rounded-md text-on-brand-muted hover:bg-bosco-700 hover:text-on-brand"
    >
      <Bell className="size-5" aria-hidden />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-promo px-1 text-center text-caption leading-5 font-semibold text-ink ring-2 ring-brand">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

/** Campanella con il numero di lead nuovi, non ancora aperti. */
export async function UnreadBell() {
  // Nel layout su ogni pagina (anche abbonamento): da sospeso non deve rimbalzare via, o va in loop.
  const { partner } = await requirePartner({ allowSuspended: true });
  const counts = await countLeadsByStatus(partner.id);
  return <BellLink unread={counts.new ?? 0} />;
}
