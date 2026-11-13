import Link from "next/link";
import { Suspense } from "react";
import { moderateComment } from "@/app/(pubblico)/ispirazione/comment-actions";
import { HiddenWordsForm } from "@/components/partner/hidden-words-form";
import { PartnerPageHeader } from "@/components/partner/page-header";
import { PartnerSkeleton } from "@/components/partner/skeleton";
import { Button } from "@/components/ui/button";
import { requirePartner } from "@/lib/auth/session";
import { getHiddenWords, listBlocks, listPartnerComments } from "@/lib/data/comments";
import { getSubscription } from "@/lib/data/partner-area";
import { freePerson } from "./actions";

export const metadata = { title: "Commenti" };

const day = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

/** Moderazione dei commenti sotto i propri lavori: da approvare, nascosti, persone bloccate o limitate, parole nascoste. */
export default function CommentsPage() {
  return (
    <Suspense fallback={<PartnerSkeleton />}>
      <Comments />
    </Suspense>
  );
}

type Row = Awaited<ReturnType<typeof listPartnerComments>>[number];

async function Comments() {
  const { partner } = await requirePartner();
  const [sub, waiting, blocks, words] = await Promise.all([
    getSubscription(partner.id),
    listPartnerComments(partner.id, ["pending", "hidden"]),
    listBlocks(partner.id),
    getHiddenWords(partner.id),
  ]);
  const pending = waiting.filter((c) => c.status === "pending");
  const hidden = waiting.filter((c) => c.status === "hidden");
  return (
    <div className="flex flex-col gap-6">
      <PartnerPageHeader
        title="Commenti"
        subtitle="Quello che le persone scrivono sotto i tuoi lavori in Ispirazione"
        partnerName={partner.displayName}
        logoUrl={partner.logoUrl}
        planCode={sub?.planCode}
      />

      <section aria-labelledby="da-approvare" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
        <h2 id="da-approvare" className="text-h4 font-semibold">
          Da approvare
        </h2>
        <p className="text-body-s text-ink-2">
          Finiscono qui i commenti con una parola del filtro, quelli delle persone che hai limitato e quelli segnalati da più persone. Finché non li
          approvi li vedete solo tu e chi li ha scritto.
        </p>
        {pending.length === 0 ? <p className="text-body-s">Nessun commento in attesa.</p> : <List rows={pending} />}
      </section>

      {hidden.length > 0 && (
        <section aria-labelledby="nascosti" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
          <h2 id="nascosti" className="text-h4 font-semibold">
            Nascosti da te
          </h2>
          <List rows={hidden} />
        </section>
      )}

      <section aria-labelledby="persone" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
        <h2 id="persone" className="text-h4 font-semibold">
          Persone bloccate o limitate
        </h2>
        <p className="text-body-s text-ink-2">
          Chi è bloccato non commenta più i tuoi lavori e non ti segue. Chi è limitato può scrivere, ma il commento si vede solo dopo la tua
          approvazione. Si blocca o si limita dal menu accanto a un commento, nella pagina del lavoro.
        </p>
        {blocks.length === 0 ? (
          <p className="text-body-s">Non hai bloccato né limitato nessuno.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {blocks.map((b) => (
              <li key={b.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <p className="text-body-s">
                  <span className="font-semibold">{b.name}</span> · {b.mode === "blocked" ? "Bloccata" : "Limitata"} dal {day.format(b.createdAt)}
                </p>
                <form action={freePerson.bind(null, b.userId)}>
                  <Button type="submit" size="s" variant="secondary">
                    {b.mode === "blocked" ? "Sblocca" : "Togli il limite"}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="parole-titolo" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
        <h2 id="parole-titolo" className="text-h4 font-semibold">
          Parole nascoste
        </h2>
        <p className="text-body-s text-ink-2">
          Un filtro di base ferma già insulti e volgarità più comuni. Qui aggiungi le parole o le frasi che non vuoi sotto i tuoi lavori: un
          commento che le contiene non viene cancellato, aspetta la tua approvazione. I link nei commenti non sono mai ammessi.
        </p>
        <HiddenWordsForm words={words} />
      </section>
    </div>
  );
}

function List({ rows }: { rows: Row[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {rows.map((c) => (
        <li key={c.id} className="flex flex-col gap-2 py-4">
          <p className="text-body-s text-ink-2">
            <span className="font-semibold text-ink">{c.authorName}</span> · {day.format(c.createdAt)} · sotto{" "}
            <Link href={`/ispirazione/${c.itemId}#commenti`} className="font-semibold text-primary hover:underline">
              {c.itemTitle}
            </Link>
          </p>
          <p className="text-body whitespace-pre-line [overflow-wrap:anywhere]">{c.body}</p>
          <div className="flex flex-wrap gap-2">
            <form action={moderateComment.bind(null, c.id, "approve")}>
              <Button type="submit" size="s">
                {c.status === "pending" ? "Approva" : "Mostra di nuovo"}
              </Button>
            </form>
            {c.status === "pending" && (
              <form action={moderateComment.bind(null, c.id, "hide")}>
                <Button type="submit" size="s" variant="secondary">
                  Nascondi
                </Button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
