import { ticketStatusLabel, type TicketStatus } from "@/lib/domain/support";
import { cn } from "@/lib/utils";

const STYLE: Record<TicketStatus, string> = {
  open: "bg-sponsor text-ink",
  waiting: "bg-info-soft text-info",
  resolved: "bg-subtle text-primary",
};

/** Come vede lo stato chi ha scritto: "da rispondere" per noi è "in lavorazione" per lui. */
const REQUESTER_LABEL: Record<TicketStatus, string> = {
  open: "In lavorazione",
  waiting: "Ti abbiamo risposto",
  resolved: "Risolta",
};

/** Stato di una richiesta di assistenza: nel gestionale (team) o nell'Area Partner (chi ha scritto). */
export function TicketStatusPill({ status, audience = "team" }: { status: TicketStatus; audience?: "team" | "requester" }) {
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-caption font-semibold whitespace-nowrap", STYLE[status])}>
      {audience === "team" ? ticketStatusLabel(status) : REQUESTER_LABEL[status]}
    </span>
  );
}
