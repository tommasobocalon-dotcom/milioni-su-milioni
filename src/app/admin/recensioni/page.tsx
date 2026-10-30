import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { setReviewStatusAction } from "@/app/admin/actions";
import { AdminPageHeader, AdminSkeleton, dateOnly, Empty, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { Stars } from "@/components/ui/stars";
import { requireAdmin } from "@/lib/auth/session";
import { countReviewsByStatus, listReviewsAdmin, type ReviewStatus } from "@/lib/data/admin";
import { cn } from "@/lib/utils";

export const metadata = { title: "Recensioni" };

const STATUSES: { value: ReviewStatus; label: string; one: string; style: string }[] = [
  { value: "flagged", label: "Segnalate", one: "Segnalata", style: "bg-sponsor text-ink" },
  { value: "published", label: "Pubblicate", one: "Pubblicata", style: "bg-subtle text-primary" },
  { value: "hidden", label: "Nascoste", one: "Nascosta", style: "bg-muted text-ink-2" },
];
const isStatus = (v: unknown): v is ReviewStatus => STATUSES.some((s) => s.value === v);

export default function ReviewsPage({ searchParams }: PageProps<"/admin/recensioni">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      {searchParams.then((sp) => (
        <Reviews status={isStatus(sp.stato) ? sp.stato : undefined} />
      ))}
    </Suspense>
  );
}

async function Reviews({ status }: { status?: ReviewStatus }) {
  await requireAdmin();
  await connection();
  const [counts, rows] = await Promise.all([countReviewsByStatus(), listReviewsAdmin(status)]);
  const href = (s?: string) => `/admin/recensioni${s ? `?stato=${s}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Recensioni" subtitle="Solo da clienti con una richiesta verificata. Nascondi quelle offensive o false: non si modificano." />
      <Panel>
        <div className="flex flex-wrap gap-2 p-5">
          <ChipLink href={href()} selected={!status}>
            Tutte ({counts.all})
          </ChipLink>
          {STATUSES.map((s) => (
            <ChipLink key={s.value} href={href(s.value)} selected={status === s.value}>
              {s.label} ({counts[s.value]})
            </ChipLink>
          ))}
        </div>
        {rows.length === 0 ? (
          <Empty>Nessuna recensione in questo stato.</Empty>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {rows.map((r) => {
              const st = STATUSES.find((s) => s.value === r.status)!;
              return (
                <li key={r.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="flex flex-wrap items-center gap-2 text-body-s">
                      <Stars value={r.rating} size={14} />
                      <span className="font-semibold">{r.authorName}</span>
                      <span className="text-ink-2">
                        su{" "}
                        <Link href={`/admin/partner/${r.partnerId}`} className="text-primary underline">
                          {r.partnerName}
                        </Link>{" "}
                        · {dateOnly.format(r.createdAt)}
                      </span>
                    </p>
                    <p className="text-body-s break-words">&ldquo;{r.text}&rdquo;</p>
                    {r.partnerReply && <p className="text-caption text-ink-2">Risposta del partner: {r.partnerReply}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-caption font-semibold", st.style)}>{st.one}</span>
                    {r.status !== "published" && (
                      <form action={setReviewStatusAction.bind(null, r.id)}>
                        <input type="hidden" name="status" value="published" />
                        <Button type="submit" size="s" variant="secondary">
                          Pubblica
                        </Button>
                      </form>
                    )}
                    {r.status !== "hidden" && (
                      <form action={setReviewStatusAction.bind(null, r.id)}>
                        <input type="hidden" name="status" value="hidden" />
                        <Button type="submit" size="s" variant="danger">
                          Nascondi
                        </Button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
