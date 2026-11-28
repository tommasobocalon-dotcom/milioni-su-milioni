import Link from "next/link";
import { resolveLeadReportAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/forms";
import { ago, dateOnly } from "@/components/admin/ui";
import { REPORT_REASONS } from "@/lib/domain/lead-rules";
import { statusInfo } from "@/lib/leads/status";
import { leadOutcome, sponsorshipState } from "@/lib/domain/admin";
import { cn } from "@/lib/utils";
import { aLuogo } from "@/lib/domain/format";

/** Elenchi del gestionale usati in più pagine: richieste dei clienti e sponsorizzazioni. */

const PILL = "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-caption font-semibold whitespace-nowrap";
const TONE = { ok: "bg-subtle text-primary", warn: "bg-sponsor text-ink", bad: "bg-error-soft text-error", muted: "bg-muted text-ink-2" } as const;

const REPORT = {
  open: { label: "Segnalata: da decidere", style: TONE.warn },
  accepted: { label: "Segnalazione accolta", style: TONE.muted },
  rejected: { label: "Segnalazione respinta", style: TONE.muted },
} as const;

/** Link alla dashboard Stripe: in sandbox con /test, così si apre il cliente giusto. */
export function stripeDashboardUrl(kind: "customers" | "subscriptions", id: string) {
  const test = !process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_");
  return `https://dashboard.stripe.com${test ? "/test" : ""}/${kind}/${id}`;
}

type LeadRow = {
  id: string;
  createdAt: Date;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  requestType: string;
  category: string;
  municipality: string;
  partnerId: string;
  partnerName: string;
  status: string;
  charge: string;
  verifiedAt: Date | null;
  deliveredAt: Date | null;
  reportStatus: string | null;
  reportReason: string | null;
  /** Risposta all'email "Com'è andata?": null finché il cliente non risponde. */
  clientContacted: boolean | null;
};

export function LeadList({ leads, now, showPartner = true }: { leads: LeadRow[]; now: Date; showPartner?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {leads.map((l) => {
        const outcome = leadOutcome(l);
        return (
          <li key={l.id} className="grid gap-1 px-5 py-3 text-body-s md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-semibold">
                {l.requestType} · {l.category} {aLuogo(l.municipality)}
              </span>
              <span className="truncate text-caption text-ink-2">
                {l.clientName} ·{" "}
                <a href={`mailto:${l.clientEmail}`} className="text-primary underline">
                  {l.clientEmail}
                </a>{" "}
                · {l.clientPhone}
                {showPartner && (
                  <>
                    {" · per "}
                    <Link href={`/admin/partner/${l.partnerId}`} className="text-primary underline">
                      {l.partnerName}
                    </Link>
                  </>
                )}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-2 text-caption text-ink-2">
              <span title={dateOnly.format(l.createdAt)}>{ago(l.createdAt, now)}</span>
              {outcome.key === "delivered" && <span className={cn(PILL, statusInfo(l.status).tone)}>{statusInfo(l.status).label}</span>}
              <span className={cn(PILL, TONE[outcome.tone])}>{outcome.label}</span>
              {l.clientContacted !== null && (
                <span className={cn(PILL, l.clientContacted ? TONE.ok : TONE.bad)}>{l.clientContacted ? "Cliente richiamato" : "Cliente non richiamato"}</span>
              )}
              {l.reportStatus && <span className={cn(PILL, REPORT[l.reportStatus as keyof typeof REPORT].style)}>{REPORT[l.reportStatus as keyof typeof REPORT].label}</span>}
            </span>
            {l.reportStatus && <ReportDecision lead={l} />}
          </li>
        );
      })}
    </ul>
  );
}

/** Segnalazione dell'azienda (PRD §7.4): motivo e, se è ancora aperta, la decisione del team. */
function ReportDecision({ lead }: { lead: LeadRow }) {
  const reason = REPORT_REASONS.find((r) => r.value === lead.reportReason)?.label ?? lead.reportReason;
  return (
    <div className="flex flex-col gap-2 md:col-span-2 md:flex-row md:items-center md:justify-between">
      <p className="text-caption text-ink-2">
        Motivo della segnalazione: <strong className="text-ink">{reason}</strong>
      </p>
      {lead.reportStatus === "open" && (
        <div className="flex shrink-0 gap-2">
          <form action={resolveLeadReportAction.bind(null, lead.id)}>
            <input type="hidden" name="decision" value="accept" />
            <ConfirmButton size="s" confirm={`Accogliere la segnalazione di ${lead.partnerName}? La richiesta non conterà più tra quelle ricevute.`}>
              Accogli e restituisci
            </ConfirmButton>
          </form>
          <form action={resolveLeadReportAction.bind(null, lead.id)}>
            <input type="hidden" name="decision" value="reject" />
            <ConfirmButton size="s" variant="secondary" confirm={`Respingere la segnalazione di ${lead.partnerName}? La richiesta resta conteggiata.`}>
              Respingi
            </ConfirmButton>
          </form>
        </div>
      )}
    </div>
  );
}

export const SPONSORSHIP_KIND = { home: "Logo in Home", search: "Boost nella ricerca", area: "Zona in più" } as const;

const STATE = {
  scheduled: { label: "Programmata", style: TONE.muted },
  active: { label: "Attiva", style: TONE.ok },
  ending: { label: "Finisce entro 3 giorni", style: TONE.warn },
  ended: { label: "Finita", style: TONE.muted },
} as const;

type SponsorshipRow = { id: string; kind: keyof typeof SPONSORSHIP_KIND; partnerId: string; partnerName: string; zone: string; startsAt: Date; endsAt: Date };

export function SponsorshipList({ rows, now, showPartner = true }: { rows: SponsorshipRow[]; now: Date; showPartner?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((s) => {
        const state = STATE[sponsorshipState(s, now)];
        return (
          <li key={s.id} className="grid gap-1 px-5 py-3 text-body-s md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-semibold">
                {SPONSORSHIP_KIND[s.kind]}
                {showPartner && (
                  <>
                    {" · "}
                    <Link href={`/admin/partner/${s.partnerId}`} className="text-primary underline">
                      {s.partnerName}
                    </Link>
                  </>
                )}
              </span>
              <span className="truncate text-caption text-ink-2">{s.zone}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2 text-caption text-ink-2">
              <span>
                {dateOnly.format(s.startsAt)} → {dateOnly.format(s.endsAt)}
              </span>
              <span className={cn(PILL, state.style)}>{state.label}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
