import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { replySupportTicket } from "@/app/area-partner/actions";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { Geco } from "@/components/site/geco";
import { MessageForm } from "@/components/ui/message-form";
import { TicketStatusPill } from "@/components/ui/ticket-status";
import { requirePartner } from "@/lib/auth/session";
import { getPartnerTicket } from "@/lib/data/support";
import { cn } from "@/lib/utils";

export const metadata = { title: "Richiesta di assistenza" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

export default function SupportTicketPage({ params }: PageProps<"/area-partner/assistenza/[numero]">) {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      {params.then((p) => (
        <Ticket number={p.numero} />
      ))}
    </Suspense>
  );
}

async function Ticket({ number: raw }: { number: string }) {
  const { partner } = await requirePartner();
  if (!/^\d{1,9}$/.test(raw)) notFound();
  const t = await getPartnerTicket(partner.id, Number(raw));
  if (!t) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/area-partner/assistenza" className="inline-flex items-center gap-1 self-start text-body-s font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Assistenza
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-h1 break-words">
          #{t.number} · {t.subject}
        </h1>
        <div className="flex items-center gap-3">
          <TicketStatusPill status={t.status} audience="requester" />
          <span className="text-body-s text-ink-2">Aperta il {dateFmt.format(t.createdAt)}</span>
        </div>
      </header>

      <ol className="flex flex-col gap-3" aria-label="Conversazione">
        {t.messages.map((m) => {
          const team = m.kind === "reply";
          return (
            <li key={m.id} className={cn("flex gap-3", team ? "" : "flex-row-reverse")}>
              {team && <Geco outfit="partner" size={40} decorative />}
              <div className={cn("flex max-w-[85%] flex-col gap-1 rounded-lg border p-4", team ? "border-salvia-300 bg-subtle" : "border-line bg-surface")}>
                <p className="text-caption text-ink-2">
                  <span className="font-semibold text-ink">{team ? `${m.authorName.split(" ")[0]} · Assistenza geco` : m.authorName}</span> ·{" "}
                  <time dateTime={m.createdAt.toISOString()}>{dateFmt.format(m.createdAt)}</time>
                </p>
                <p className="text-body-s break-words whitespace-pre-line">{m.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="rounded-lg border border-line bg-surface p-5">
        <MessageForm
          id="risposta"
          action={replySupportTicket.bind(null, t.number)}
          label={t.status === "resolved" ? "Riapri la richiesta con un nuovo messaggio" : "Rispondi"}
          help="Ti avvisiamo per email quando arriva la nostra risposta."
          submit="Invia"
        />
      </section>
    </div>
  );
}
