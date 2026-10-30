import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { connection } from "next/server";
import { addTicketNoteAction, replyTicketAction, setTicketStatusAction, toggleTicketAssigneeAction } from "@/app/admin/actions";
import { AdminPageHeader, AdminSkeleton, dateTime, Panel, TicketStatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { MessageForm } from "@/components/ui/message-form";
import { requireAdmin } from "@/lib/auth/session";
import { getTicketAdmin } from "@/lib/data/support";
import { TICKET_CHANNEL_LABEL, TICKET_STATUSES, ticketTag, topicLabel } from "@/lib/domain/support";
import { cn } from "@/lib/utils";

export const metadata = { title: "Richiesta di assistenza" };

export default function TicketPage({ params }: PageProps<"/admin/assistenza/[numero]">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      {params.then((p) => (
        <Ticket number={p.numero} />
      ))}
    </Suspense>
  );
}

const KIND = {
  inbound: { label: "", style: "border-line bg-surface" },
  reply: { label: "Risposta inviata", style: "border-salvia-300 bg-subtle" },
  note: { label: "Nota interna, non visibile al cliente", style: "border-ambra-500/40 bg-sponsor" },
} as const;

async function Ticket({ number: raw }: { number: string }) {
  const admin = await requireAdmin();
  if (!/^\d{1,9}$/.test(raw)) notFound();
  await connection();
  const t = await getTicketAdmin(Number(raw));
  if (!t) notFound();
  const mine = t.assigneeId === admin.id;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`#${t.number} · ${t.subject}`}
        subtitle={`${TICKET_CHANNEL_LABEL[t.channel]} · ${topicLabel(t.topic)} · aperta il ${dateTime.format(t.createdAt)}`}
        back={{ href: "/admin/assistenza", label: "Tutte le richieste" }}
      >
        <TicketStatusPill status={t.status} />
      </AdminPageHeader>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Conversazione">
            <ol className="flex flex-col gap-3 p-5">
              {t.messages.map((m) => (
                <li key={m.id} className={cn("flex flex-col gap-2 rounded-md border p-4", KIND[m.kind].style)}>
                  <p className="flex flex-wrap items-baseline justify-between gap-2 text-caption text-ink-2">
                    <span>
                      <span className="text-body-s font-semibold text-ink">{m.authorName}</span>
                      {KIND[m.kind].label && <> · {KIND[m.kind].label}</>}
                    </span>
                    <time dateTime={m.createdAt.toISOString()}>{dateTime.format(m.createdAt)}</time>
                  </p>
                  <p className="text-body-s break-words whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Rispondi">
            <div className="flex flex-col gap-6 p-5">
              <MessageForm
                id="risposta"
                action={replyTicketAction.bind(null, t.id)}
                label={`Risposta a ${t.requesterName}`}
                help={`Parte per email a ${t.requesterEmail} con ${ticketTag(t.number)} nell'oggetto${t.partnerId ? " e compare nell'Area Partner" : ""}. La richiesta passa "in attesa del cliente".`}
                submit="Invia risposta"
              />
              <MessageForm
                id="nota"
                action={addTicketNoteAction.bind(null, t.id)}
                label="Nota interna"
                help="Resta nel gestionale: chi ha scritto non la vede."
                submit="Salva nota"
                variant="secondary"
              />
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Chi ha scritto">
            <dl className="flex flex-col gap-3 p-5 text-body-s">
              <div>
                <dt className="text-caption text-ink-2">Nome</dt>
                <dd className="font-semibold">{t.requesterName}</dd>
              </div>
              <div>
                <dt className="text-caption text-ink-2">Email</dt>
                <dd className="break-all">
                  <a href={`mailto:${t.requesterEmail}`} className="text-primary underline">
                    {t.requesterEmail}
                  </a>
                </dd>
              </div>
              {t.partnerId && (
                <div>
                  <dt className="text-caption text-ink-2">Azienda</dt>
                  <dd>
                    <Link href={`/admin/partner/${t.partnerId}`} className="font-semibold text-primary underline">
                      {t.partnerName}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
            <p className={cn("flex gap-2 border-t border-line px-5 py-3 text-caption", t.verifiedSender ? "text-primary" : "text-ink-2")}>
              {t.verifiedSender ? (
                <>
                  <ShieldCheck className="size-4 shrink-0" aria-hidden /> Ha scritto dal suo account: identità verificata.
                </>
              ) : (
                <>
                  <ShieldAlert className="size-4 shrink-0" aria-hidden /> Mittente non verificato (email o modulo senza accesso). Per modifiche
                  all&apos;account o ai pagamenti chiedi di scriverti dall&apos;Area Partner.
                </>
              )}
            </p>
          </Panel>

          <Panel title="Gestione">
            <div className="flex flex-col gap-4 p-5">
              {/* key: dopo una risposta lo stato cambia e il menu deve ripartire dal valore nuovo. */}
              <form key={t.status} action={setTicketStatusAction.bind(null, t.id)} className="flex flex-col gap-2">
                <label htmlFor="stato" className="text-body-s font-semibold">
                  Stato
                </label>
                <Select id="stato" name="status" defaultValue={t.status}>
                  {TICKET_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="s" variant="secondary" className="self-start">
                  Aggiorna stato
                </Button>
              </form>
              <form action={toggleTicketAssigneeAction.bind(null, t.id)} className="flex flex-col gap-2 border-t border-line pt-4">
                <p className="text-body-s">{t.assigneeName ? `In carico a ${t.assigneeName}` : "Non ancora in carico a nessuno"}</p>
                <Button type="submit" size="s" variant="ghost" className="self-start">
                  {mine ? "Rilascia" : "Prendi in carico"}
                </Button>
              </form>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
