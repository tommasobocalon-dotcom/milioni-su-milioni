import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Clock, Mail, MessageCircle, Phone } from "lucide-react";
import { connection } from "next/server";
import { z } from "zod";
import { saveLeadNotes, updateLeadStatus } from "@/app/area-partner/actions";
import { MarkSeen, ReportForm } from "@/components/partner/lead-client";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { requirePartner } from "@/lib/auth/session";
import { getLeadDetail } from "@/lib/data/partner-area";
import { formatPhone } from "@/lib/domain/format";
import { canReportLead, REPORT_REASONS } from "@/lib/domain/lead-rules";
import { LEAD_STATUSES } from "@/lib/leads/status";
import { whenLabel } from "@/components/partner/lead-row";

export const metadata = { title: "Richiesta" };

const fullFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const shortFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

export default function LeadPage({ params }: PageProps<"/area-partner/lead/[id]">) {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      {params.then((p) => (
        <Lead id={p.id} />
      ))}
    </Suspense>
  );
}

async function Lead({ id }: { id: string }) {
  if (!z.uuid().safeParse(id).success) notFound();
  const { partner } = await requirePartner();
  await connection();
  const now = new Date();
  const lead = await getLeadDetail(partner.id, id);
  if (!lead) notFound();

  const reportable = !lead.reportStatus && canReportLead(lead.deliveredAt, now);
  const reportDeadline = lead.deliveredAt ? new Date(lead.deliveredAt.getTime() + 72 * 3600_000) : null;
  const whatsapp = lead.clientPhone ? `https://wa.me/${lead.clientPhone.replace("+", "")}` : null;

  return (
    <div className="flex flex-col gap-6">
      <MarkSeen leadId={lead.id} isNew={lead.status === "new"} />
      <Link href="/area-partner/lead" className="inline-flex items-center gap-1 self-start text-body-s font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Tutte le richieste
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-h1">
          {lead.clientName} · {lead.requestType}
        </h1>
        <p className="text-body-s text-ink-2">
          Ricevuta {whenLabel(lead.createdAt, now)} · {lead.municipality} · numero verificato con SMS
        </p>
      </header>

      <form action={updateLeadStatus.bind(null, lead.id)} className="flex flex-wrap items-center gap-3">
        <label htmlFor="status" className="text-body-s font-semibold">
          Stato
        </label>
        <Select id="status" name="status" defaultValue={lead.status} className="w-56">
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary" size="s">
          Aggiorna stato
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h3 font-semibold">Dettagli della richiesta</h2>
              <Badge kind="verified" />
            </div>
            <dl className="divide-y divide-line">
              {[
                ["Tipo di lavoro", lead.requestType],
                ...lead.answers.map((a) => [a.label, a.key === "mq" ? `${a.value} m²` : a.value]),
                ["Quando vorrebbe iniziare", lead.timing],
                ["Fascia oraria per richiamarlo", lead.callbackSlot],
                ["Comune", lead.municipality],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5 text-body-s">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            {lead.description && (
              <>
                <h3 className="text-body-s font-semibold">Descrizione del cliente</h3>
                <p className="rounded-md bg-subtle p-4 text-body">&ldquo;{lead.description}&rdquo;</p>
              </>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
            <h2 className="text-h4 font-semibold">Cronologia</h2>
            <ol className="flex flex-col gap-2.5">
              {lead.events.map((e) => (
                <li key={e.id} className="flex gap-3 text-body-s">
                  <Clock className="mt-0.5 size-4 shrink-0 text-ink-2" aria-hidden />
                  <span className="w-32 shrink-0 text-ink-2">{shortFmt.format(e.createdAt)}</span>
                  <span>{e.message}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
            <h2 className="text-h4 font-semibold">Contatti del cliente</h2>
            {(
              <>
                <p className="inline-flex items-center gap-2 text-body">
                  <Phone className="size-4" aria-hidden /> {formatPhone(lead.clientPhone)}
                </p>
                <p className="inline-flex items-center gap-2 text-body break-all">
                  <Mail className="size-4" aria-hidden /> {lead.clientEmail}
                </p>
                <p className="inline-flex items-center gap-2 text-body-s text-ink-2">
                  <Clock className="size-4" aria-hidden /> Preferisce {lead.callbackSlot}
                </p>
                <a href={`tel:${lead.clientPhone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary font-semibold text-on-brand hover:bg-primary-hover">
                  <Phone className="size-4" aria-hidden /> Chiama
                </a>
                <div className="grid grid-cols-2 gap-2">
                  <a href={`mailto:${lead.clientEmail}`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-primary text-body-s font-semibold text-primary hover:bg-subtle">
                    <Mail className="size-4" aria-hidden /> Email
                  </a>
                  {whatsapp && (
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-primary text-body-s font-semibold text-primary hover:bg-subtle">
                      <MessageCircle className="size-4" aria-hidden /> WhatsApp
                    </a>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
            <h2 className="text-h4 font-semibold">Problema con questa richiesta?</h2>
            {lead.reportStatus ? (
              <p className="text-body-s">
                Segnalato ({REPORT_REASONS.find((r) => r.value === lead.reportReason)?.label ?? lead.reportReason}):{" "}
                {lead.reportStatus === "open" ? "in verifica, risposta entro 2 giorni lavorativi." : lead.reportStatus === "accepted" ? "accolto." : "non accolto."}
              </p>
            ) : reportable ? (
              <>
                <p className="text-body-s text-ink-2">
                  Puoi segnalarlo fino al {reportDeadline && fullFmt.format(reportDeadline)}, solo per motivi oggettivi: ci aiuta a tenere fuori numeri falsi e spam.
                </p>
                <ReportForm leadId={lead.id} />
              </>
            ) : (
              <p className="text-body-s text-ink-2">Sono passate più di 72 ore dalla consegna: non è più possibile segnalarlo.</p>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
            <h2 className="text-h4 font-semibold">Note interne</h2>
            <form action={saveLeadNotes.bind(null, lead.id)} className="flex flex-col gap-2">
              <label htmlFor="notes" className="sr-only">
                Note interne
              </label>
              <Textarea id="notes" name="notes" defaultValue={lead.notes ?? ""} maxLength={2000} placeholder="Es. sopralluogo fissato giovedì alle 18:30" />
              <p className="text-caption text-ink-2">Visibili solo al tuo team, mai al cliente.</p>
              <Button type="submit" variant="secondary" size="s">
                Salva note
              </Button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
