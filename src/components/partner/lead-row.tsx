import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import type { LeadListItem } from "@/lib/data/partner-area";
import { statusInfo } from "@/lib/leads/status";
import { cn } from "@/lib/utils";

const rel = new Intl.RelativeTimeFormat("it-IT", { numeric: "auto" });
const dayFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });

export function whenLabel(date: Date, now: Date) {
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days < 2 && date.getDate() === now.getDate()) return `oggi, ${timeFmt.format(date)}`;
  if (days < 2) return `${rel.format(-1, "day")}, ${timeFmt.format(date)}`;
  return `${dayFmt.format(date)}, ${timeFmt.format(date)}`;
}

/** Componente "Riga lead" di Figma. */
export function LeadRow({ lead, now }: { lead: LeadListItem; now: Date }) {
  const s = statusInfo(lead.status);
  const summary = [lead.requestType, ...lead.answers.filter((a) => a.key === "mq").map((a) => `${a.value} m²`)].join(" · ");
  return (
    <li>
      <Link href={`/area-partner/lead/${lead.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-subtle">
        <span className={cn("hidden w-32 shrink-0 rounded-full px-2.5 py-1 text-center text-caption font-semibold sm:inline-block", s.tone)}>
          {s.label}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            {lead.charge === "locked" ? (
              <>
                <Lock className="size-4 text-ink-2" aria-hidden /> Contatti nascosti: scegli un piano
              </>
            ) : (
              lead.clientName
            )}
          </span>
          <span className="truncate text-body-s text-ink-2">{summary}</span>
        </span>
        <span className="hidden text-right text-body-s text-ink-2 md:block">{lead.municipality}</span>
        <span className="w-28 text-right text-caption text-ink-2">{whenLabel(lead.createdAt, now)}</span>
        <ChevronRight className="size-4 text-ink-3" aria-hidden />
      </Link>
    </li>
  );
}
