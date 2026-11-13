import Link from "next/link";
import { deleteOwnComment, moderateComment } from "@/app/(pubblico)/ispirazione/comment-actions";
import { CommentForm } from "@/components/site/comment-form";
import { CommentMenu } from "@/components/site/comment-menu";
import { ReportForm } from "@/components/site/report-form";
import { getAnySessionUser, getSessionUser } from "@/lib/auth/session";
import { isEmailVerified, listComments, type CommentView } from "@/lib/data/comments";
import { isOwnPartner } from "@/lib/data/follows";
import { getSanction } from "@/lib/data/moderation";
import { commentsLabel } from "@/lib/domain/comments";
import { likeLoginHref } from "@/lib/domain/likes";
import { commentBan } from "@/lib/domain/moderation";

const day = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

const STATUS_NOTE = {
  pending: "In attesa di approvazione dell'azienda",
  hidden: "Nascosto dall'azienda",
  removed: "Tolto dalla piattaforma perché contrario alle regole",
} as const;

const item = "w-full rounded-md px-3 py-2 text-left text-body-s font-semibold hover:bg-subtle";

/**
 * Commenti sotto un lavoro (13/11/2026). Legge la sessione: va sempre dentro un <Suspense>. Chi ha fatto l'accesso
 * e confermato l'email scrive; ognuno elimina i propri e segnala quelli degli altri; chi gestisce l'azienda del
 * lavoro approva, nasconde, limita o blocca. L'autore vede sempre i propri commenti, con lo stato scritto accanto.
 */
export async function CommentSection({ itemId, partnerId, partnerName }: { itemId: string; partnerId: string; partnerName: string }) {
  const [user, business] = await Promise.all([getAnySessionUser(), getSessionUser("business")]);
  // Modera chi gestisce l'azienda, da qualunque dei due accessi sia entrato.
  const sessions = [user, business].filter((u) => u !== null);
  const memberships = await Promise.all(sessions.map((u) => isOwnPartner(u.id, partnerId)));
  const moderator = memberships.some(Boolean);
  const { comments, total } = await listComments(itemId, partnerId, { userId: user?.id ?? null, moderator });
  const [verified, ban] = user ? await Promise.all([isEmailVerified(user.id), getSanction(user.id).then(commentBan)]) : [false, null];
  const loginHref = likeLoginHref(`/ispirazione/${itemId}#commenti`);

  return (
    <section id="commenti" aria-labelledby="commenti-titolo" className="flex scroll-mt-24 flex-col gap-5 border-t border-line pt-6">
      <div className="flex flex-col gap-1">
        <h2 id="commenti-titolo" className="text-h4 font-semibold">
          Commenti
        </h2>
        <p className="text-body-s text-ink-2">
          {commentsLabel(total)}. Domande e consigli sul lavoro: non sono recensioni di {partnerName}.
        </p>
      </div>

      {comments.length > 0 && (
        <ul className="flex flex-col gap-4">
          {comments.map((c) => (
            <Comment key={c.id} c={c} signedIn={!!user} moderator={moderator} />
          ))}
        </ul>
      )}

      {!user ? (
        <p className="rounded-lg bg-subtle p-4 text-body-s">
          Per scrivere un commento devi entrare con il tuo account.{" "}
          <Link href={loginHref} className="font-semibold text-primary underline underline-offset-2 hover:text-primary-hover">
            Accedi per commentare
          </Link>
        </p>
      ) : !verified ? (
        <p className="rounded-lg bg-subtle p-4 text-body-s">
          Per commentare conferma prima la tua email: trovi il link nell&apos;
          <Link href="/area-cliente" className="font-semibold text-primary underline underline-offset-2 hover:text-primary-hover">
            Area cliente
          </Link>
          .
        </p>
      ) : ban ? (
        <p className="rounded-lg bg-subtle p-4 text-body-s">
          {ban} Se pensi che ci siamo sbagliati{" "}
          <Link href="/assistenza" className="font-semibold text-primary underline underline-offset-2 hover:text-primary-hover">
            scrivi all&apos;assistenza
          </Link>
          .
        </p>
      ) : (
        <CommentForm itemId={itemId} />
      )}
    </section>
  );
}

function Comment({ c, signedIn, moderator }: { c: CommentView; signedIn: boolean; moderator: boolean }) {
  const note = c.status === "visible" ? null : STATUS_NOTE[c.status];
  const canModerate = moderator && c.status !== "removed";
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-body-s">
          <span className="font-semibold text-ink">{c.authorName}</span>
          {c.fromCompany && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-caption font-semibold text-brand">Azienda</span>}
          <time dateTime={c.createdAt.toISOString()} className="text-ink-2">
            {day.format(c.createdAt)}
          </time>
        </p>
        <CommentMenu label={`Azioni sul commento di ${c.authorName}`}>
            {c.mine && (
              <form action={deleteOwnComment.bind(null, c.id)}>
                <button type="submit" className={`${item} text-error`}>
                  Elimina il mio commento
                </button>
              </form>
            )}
            {canModerate && (
              <>
                {c.status !== "visible" && <Action id={c.id} op="approve" label={c.status === "pending" ? "Approva" : "Mostra di nuovo"} />}
                {c.status !== "hidden" && <Action id={c.id} op="hide" label="Nascondi" />}
                {!c.mine && !c.fromCompany && (
                  <>
                    {c.authorBlock === "limited" ? <Action id={c.id} op="free" label="Togli il limite a questa persona" /> : c.authorBlock === null && <Action id={c.id} op="limit" label="Limita questa persona" />}
                    {c.authorBlock === "blocked" ? <Action id={c.id} op="free" label="Sblocca questa persona" /> : <Action id={c.id} op="block" label="Blocca questa persona" />}
                  </>
                )}
              </>
            )}
            {!c.mine &&
              c.status !== "removed" &&
              (signedIn ? (
                <details>
                  <summary className={`${item} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>Segnala</summary>
                  <div className="px-3 pt-1 pb-2">
                    <ReportForm commentId={c.id} />
                  </div>
                </details>
              ) : (
                <Link href="/assistenza" className={item}>
                  Segnala
                </Link>
              ))}
        </CommentMenu>
      </div>
      <p className="text-body whitespace-pre-line text-ink [overflow-wrap:anywhere]">{c.body}</p>
      {(note || c.authorBlock) && (
        <p className="text-caption font-semibold text-ink-2">
          {[note, c.authorBlock === "blocked" ? "Persona bloccata" : c.authorBlock === "limited" ? "Persona limitata" : null].filter(Boolean).join(" · ")}
        </p>
      )}
    </li>
  );
}

function Action({ id, op, label }: { id: string; op: "approve" | "hide" | "limit" | "block" | "free"; label: string }) {
  return (
    <form action={moderateComment.bind(null, id, op)}>
      <button type="submit" className={item}>
        {label}
      </button>
    </form>
  );
}
