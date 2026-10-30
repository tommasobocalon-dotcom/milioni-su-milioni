import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { connection } from "next/server";
import { AdminPageHeader, AdminSkeleton, ago, Empty, Panel, TicketStatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/session";
import { countTicketsByStatus, listTickets } from "@/lib/data/support";
import { TICKET_CHANNEL_LABEL, TICKET_STATUSES, topicLabel, type TicketStatus } from "@/lib/domain/support";
import { supportEmail } from "@/lib/support/service";

export const metadata = { title: "Assistenza" };

const isStatus = (v: unknown): v is TicketStatus => TICKET_STATUSES.some((s) => s.value === v);

export default function TicketsPage({ searchParams }: PageProps<"/admin/assistenza">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      {searchParams.then((sp) => (
        <Tickets status={isStatus(sp.stato) ? sp.stato : undefined} q={typeof sp.q === "string" ? sp.q : undefined} />
      ))}
    </Suspense>
  );
}

async function Tickets({ status, q }: { status?: TicketStatus; q?: string }) {
  await requireAdmin();
  await connection();
  const now = new Date();
  const [counts, rows] = await Promise.all([countTicketsByStatus(), listTickets({ status, q })]);
  const href = (s?: string) => `/admin/assistenza${s ? `?stato=${s}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Assistenza"
        subtitle={`Richieste dal modulo del sito, dall'Area Partner e dalle email a ${supportEmail()}`}
      />

      <Panel>
        <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <ChipLink href={href()} selected={!status}>
              Tutte ({counts.all})
            </ChipLink>
            {TICKET_STATUSES.map((s) => (
              <ChipLink key={s.value} href={href(s.value)} selected={status === s.value}>
                {s.label} ({counts[s.value]})
              </ChipLink>
            ))}
          </div>
          <form role="search" className="flex gap-2" action="/admin/assistenza">
            {status && <input type="hidden" name="stato" value={status} />}
            <label htmlFor="cerca-ticket" className="sr-only">
              Cerca per numero, oggetto, nome o email
            </label>
            <Input id="cerca-ticket" name="q" defaultValue={q} placeholder="Numero, oggetto, nome o email" className="h-9 lg:w-72" />
            <Button type="submit" size="s" variant="secondary" aria-label="Cerca">
              <Search aria-hidden />
            </Button>
          </form>
        </div>

        {rows.length === 0 ? (
          <Empty>{q ? "Nessuna richiesta trovata." : "Nessuna richiesta in questo stato."}</Empty>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {rows.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/assistenza/${t.number}`} className="grid gap-1 px-5 py-3 hover:bg-subtle md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-semibold">
                      #{t.number} · {t.subject}
                    </span>
                    <span className="truncate text-caption text-ink-2">
                      {t.partnerName ? `${t.partnerName} · ` : ""}
                      {t.requesterName} &lt;{t.requesterEmail}&gt; · {TICKET_CHANNEL_LABEL[t.channel]} · {topicLabel(t.topic)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-caption text-ink-2">
                    {t.assigneeName && <span>In carico a {t.assigneeName.split(" ")[0]}</span>}
                    <span>{ago(t.lastMessageAt, now)}</span>
                    <TicketStatusPill status={t.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
