import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { connection } from "next/server";
import { z } from "zod";
import { setAccountStatusAction, setVerificationAction } from "@/app/admin/actions";
import { AccountStatusForm } from "@/components/admin/forms";
import { AccountStatusPill, actionLabel, AdminPageHeader, AdminSkeleton, dateOnly, dateTime, Empty, Panel, TicketStatusPill, VerificationPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { getPartnerAdmin } from "@/lib/data/admin";

export const metadata = { title: "Partner" };

export default function PartnerAdminPage({ params }: PageProps<"/admin/partner/[id]">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      {params.then((p) => (
        <PartnerDetail id={p.id} />
      ))}
    </Suspense>
  );
}

const TYPE_LABEL = { agency: "Agenzia immobiliare", technician: "Tecnico", artisan: "Artigiano", b2b: "Partner B2B" } as const;
const PERIOD_LABEL = { monthly: "mensile", yearly: "annuale" } as const;
const SUB_LABEL = { active: "attivo", activating: "da pagare", suspended: "sospeso (pagamento non riuscito)", cancelled: "disdetto" } as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 py-2">
      <dt className="text-ink-2">{label}</dt>
      <dd className="min-w-0 break-words">{children || "—"}</dd>
    </div>
  );
}

async function PartnerDetail({ id }: { id: string }) {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) notFound();
  await connection();
  const p = await getPartnerAdmin(id);
  if (!p) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={p.displayName}
        subtitle={`${TYPE_LABEL[p.type]} · ${p.category} · ${p.municipality} (${p.provinceCode}) · iscritto il ${dateOnly.format(p.createdAt)}`}
        back={{ href: "/admin/partner", label: "Tutti i partner" }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <VerificationPill status={p.verificationStatus} />
          <AccountStatusPill status={p.accountStatus} />
          {p.accountStatus === "active" && (
            <Link href={p.publicPath} target="_blank" className="inline-flex items-center gap-1 text-body-s font-semibold text-primary hover:underline">
              Scheda pubblica <ExternalLink className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      </AdminPageHeader>

      <section aria-label="Indicatori" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Piano", value: p.sub ? p.sub.planName : "Nessuno", note: p.sub ? `${PERIOD_LABEL[p.sub.period]}, ${SUB_LABEL[p.sub.status]}` : "Non ha ancora pagato" },
          { label: "Piano", value: p.sub?.planName ?? "—", note: p.sub ? `Rinnovo il ${dateOnly.format(p.sub.currentPeriodEnd)}` : "" },
          { label: "Lead ricevuti", value: String(p.leads.total), note: `${p.leads.last30} negli ultimi 30 giorni · ${p.leads.reported} segnalati` },
        ].map((k) => (
          <div key={k.label} className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-5">
            <p className="text-body-s text-ink-2">{k.label}</p>
            <p className="font-display text-h2">{k.value}</p>
            {k.note && <p className="text-caption text-ink-2">{k.note}</p>}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Dati aziendali">
            <dl className="divide-y divide-line px-5 text-body-s">
              <Row label="Ragione sociale">{p.businessName}</Row>
              <Row label="Partita IVA">{p.vatNumber}</Row>
              <Row label="Codice fiscale">{p.taxCode}</Row>
              <Row label="Codice SDI">{p.sdiCode}</Row>
              <Row label="PEC">{p.pec}</Row>
              <Row label="Sede">{p.address}</Row>
              <Row label="Telefono">{p.phone}</Row>
              <Row label="Email">{p.email && <a href={`mailto:${p.email}`} className="text-primary underline">{p.email}</a>}</Row>
              <Row label="Completezza">{`${p.completeness}%`}</Row>
              <Row label="Cliente Stripe">{p.stripeCustomerId}</Row>
            </dl>
          </Panel>

          <Panel title="Persone con accesso">
            {p.members.length === 0 && <Empty>Nessun account collegato a questa azienda.</Empty>}
            <ul className="divide-y divide-line empty:hidden">
              {p.members.map((m) => (
                <li key={m.email} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-body-s">
                  <span>
                    <span className="font-semibold">{m.name}</span> · <a href={`mailto:${m.email}`} className="text-primary underline">{m.email}</a>
                  </span>
                  <span className="text-caption text-ink-2">
                    {m.role === "owner" ? "Titolare" : "Collaboratore"} · {m.emailVerifiedAt ? "email confermata" : "email non confermata"}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Richieste di assistenza">
            {p.tickets.length === 0 ? (
              <Empty>Nessuna richiesta.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {p.tickets.map((t) => (
                  <li key={t.number}>
                    <Link href={`/admin/assistenza/${t.number}`} className="flex items-center justify-between gap-3 px-5 py-3 text-body-s hover:bg-subtle">
                      <span className="truncate">
                        #{t.number} · {t.subject}
                      </span>
                      <TicketStatusPill status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Verifica">
            <div className="flex flex-col gap-3 p-5">
              <p className="text-body-s text-ink-2">Il badge &quot;Verificato&quot; compare sulla scheda pubblica dopo il controllo di P.IVA, sede e documenti.</p>
              <div className="flex flex-wrap gap-2">
                {p.verificationStatus !== "verified" && (
                  <form action={setVerificationAction.bind(null, p.id)}>
                    <input type="hidden" name="status" value="verified" />
                    <Button type="submit" size="s">
                      Segna come verificato
                    </Button>
                  </form>
                )}
                {p.verificationStatus !== "rejected" && (
                  <form action={setVerificationAction.bind(null, p.id)}>
                    <input type="hidden" name="status" value="rejected" />
                    <Button type="submit" size="s" variant="danger">
                      Respingi
                    </Button>
                  </form>
                )}
                {p.verificationStatus !== "pending" && (
                  <form action={setVerificationAction.bind(null, p.id)}>
                    <input type="hidden" name="status" value="pending" />
                    <Button type="submit" size="s" variant="ghost">
                      Rimetti da verificare
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Account">
            <div className="flex flex-col gap-3 p-5">
              <p className="text-body-s text-ink-2">
                {p.accountStatus === "suspended"
                  ? "Sospeso: la scheda non compare nelle ricerche e i nuovi lead non vengono consegnati."
                  : "La sospensione nasconde la scheda e ferma i nuovi lead. Un pagamento andato a buon fine la toglie in automatico."}
              </p>
              <AccountStatusForm action={setAccountStatusAction.bind(null, p.id)} suspended={p.accountStatus === "suspended"} />
            </div>
          </Panel>

          <Panel title="Storico">
            {p.history.length === 0 ? (
              <Empty>Nessuna attività registrata.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {p.history.map((h) => (
                  <li key={h.id} className="flex flex-col gap-0.5 px-5 py-2.5 text-caption">
                    <span className="font-semibold text-ink">{actionLabel(h.action)}</span>
                    <span className="text-ink-2">
                      {h.actor} · {dateTime.format(h.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
