import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { rejectCommentReportsAction, removeCommentAction, resendStrikeEmailAction, revokeStrikeAction } from "@/app/admin/actions";
import { RemoveCommentForm, ResendStrikeEmailForm } from "@/components/admin/forms";
import { AdminPageHeader, AdminSkeleton, dateTime, Empty, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { listReportedComments, listStrikes, sanctionsOf, type ReportedComment } from "@/lib/data/moderation";
import { REPORT_REASONS } from "@/lib/domain/comments";
import { nextSanctionLabel, type Sanction } from "@/lib/domain/moderation";
import { cn } from "@/lib/utils";

export const metadata = { title: "Commenti segnalati" };

export default function ReportedCommentsPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Reported />
    </Suspense>
  );
}

const reasonLabel = (value: string) => REPORT_REASONS.find((r) => r.value === value)?.label ?? value;

const STATUS = {
  visible: { label: "Visibile", style: "bg-subtle text-primary" },
  pending: { label: "In attesa dell'azienda", style: "bg-sponsor text-ink" },
  hidden: { label: "Nascosto dall'azienda", style: "bg-muted text-ink-2" },
  removed: { label: "Tolto", style: "bg-error-soft text-error" },
} as const;

const PILL = "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-caption font-semibold whitespace-nowrap";

/** Motivo segnalato più volte tra le segnalazioni aperte: è quello proposto nel modulo. */
function topReason(c: ReportedComment): string {
  const tally = new Map<string, number>();
  for (const r of c.reports) if (r.status === "open") tally.set(r.reason, (tally.get(r.reason) ?? 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? c.reports[0].reason;
}

async function Reported() {
  await requireAdmin();
  await connection();
  const [comments, strikes] = await Promise.all([listReportedComments(), listStrikes()]);
  const sanctions = await sanctionsOf(strikes.map((s) => s.userId));
  const open = comments.filter((c) => c.open > 0);
  const closed = comments.filter((c) => c.open === 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Commenti segnalati"
        subtitle={`${open.length} da guardare. Togliere un commento vale come violazione per chi l'ha scritto: avviso, poi 7 giorni, 30 giorni e infine blocco dei commenti.`}
      />

      <Panel title="Da guardare">
        {open.length === 0 ? (
          <Empty>Nessun commento segnalato in attesa.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {open.map((c) => (
              <li key={c.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <Summary c={c} />
                <div className="flex flex-col gap-3">
                  <RemoveCommentForm
                    action={removeCommentAction.bind(null, c.id)}
                    reasons={REPORT_REASONS}
                    defaultReason={topReason(c)}
                    consequence={nextSanctionLabel(c.author.activeStrikes)}
                  />
                  <form action={rejectCommentReportsAction.bind(null, c.id)}>
                    <Button type="submit" size="s" variant="secondary">
                      Respingi le segnalazioni
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {closed.length > 0 && (
        <Panel title="Già decisi">
          <ul className="divide-y divide-line">
            {closed.slice(0, 50).map((c) => (
              <li key={c.id} className="px-5 py-4">
                <Summary c={c} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Violazioni">
        {strikes.length === 0 ? (
          <Empty>Nessun commento tolto finora.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {strikes.map((s) => {
              const sanction = sanctions.get(s.userId);
              return (
                <li key={s.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-semibold">
                      {s.userName} <span className="font-normal text-ink-2">· {s.userEmail}</span>
                    </p>
                    <p className="text-body-s [overflow-wrap:anywhere]">&ldquo;{s.commentBody}&rdquo;</p>
                    <p className="text-caption text-ink-2">
                      {reasonLabel(s.reason)} · tolto il {dateTime.format(s.createdAt)} da {s.decidedBy}
                      {s.note && ` · nota: ${s.note}`}
                    </p>
                    <p className={cn("text-caption font-semibold", s.notifiedAt ? "text-ink-2" : "text-error")}>
                      {s.notifiedAt ? `Autore avvisato per email il ${dateTime.format(s.notifiedAt)}` : "L'email all'autore non è partita"}
                    </p>
                    {!s.revokedAt && sanction && (
                      <p className="text-caption font-semibold text-ink-2">
                        Violazioni che contano per questa persona: {sanction.strikes} · {sanctionLabel(sanction)}
                      </p>
                    )}
                  </div>
                  {s.revokedAt ? (
                    <span className={cn(PILL, "bg-muted text-ink-2")}>Annullata il {dateTime.format(s.revokedAt)}</span>
                  ) : (
                    <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                      <form action={revokeStrikeAction.bind(null, s.id)}>
                        <Button type="submit" size="s" variant="secondary">
                          Annulla la violazione
                        </Button>
                      </form>
                      {!s.notifiedAt && <ResendStrikeEmailForm action={resendStrikeEmailAction.bind(null, s.id)} />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function sanctionLabel(s: Sanction): string {
  if (s.level === "blocked") return "commenti bloccati";
  if (s.level === "suspended") return `commenti fermi fino al ${dateTime.format(s.until)}`;
  return "può commentare";
}

function Summary({ c }: { c: ReportedComment }) {
  const status = STATUS[c.status];
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">
          {c.author.name} <span className="font-normal text-ink-2">· {c.author.email}</span>
        </p>
        <span className={cn(PILL, status.style)}>{status.label}</span>
      </div>
      <p className="text-body [overflow-wrap:anywhere] whitespace-pre-line">&ldquo;{c.body}&rdquo;</p>
      <p className="text-caption text-ink-2">
        Scritto il {dateTime.format(c.createdAt)} sotto{" "}
        <Link href={`/ispirazione/${c.work.id}#commenti`} className="text-primary underline">
          {c.work.title}
        </Link>{" "}
        di{" "}
        <Link href={`/admin/partner/${c.work.partnerId}`} className="text-primary underline">
          {c.work.partnerName}
        </Link>
        {c.author.activeStrikes > 0 && ` · l'autore ha già ${c.author.activeStrikes} ${c.author.activeStrikes === 1 ? "violazione" : "violazioni"}`}
      </p>
      <ul className="flex flex-col gap-1 text-body-s">
        {c.reports.map((r, i) => (
          <li key={i}>
            <strong>{reasonLabel(r.reason)}</strong>
            {r.note && `: ${r.note}`} <span className="text-ink-2">· {dateTime.format(r.createdAt)}{r.status !== "open" && ` · ${r.status === "accepted" ? "accolta" : "respinta"}`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
