import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { LikeButton } from "@/components/site/like-button";
import { ProjectGallery } from "@/components/site/project-gallery";
import { ButtonLink } from "@/components/ui/button";
import { getAnySessionUser } from "@/lib/auth/session";
import { getLikedIds, getShowcaseItem } from "@/lib/data/showcase";
import { likeLoginHref } from "@/lib/domain/likes";

export async function generateMetadata({ params }: PageProps<"/ispirazione/[id]">): Promise<Metadata> {
  const item = await getShowcaseItem((await params).id);
  if (!item) return {};
  return {
    title: `${item.title} — ${item.partnerName}`,
    description: item.description ?? `Un lavoro di ${item.partnerName}, ${item.categoryName}${item.place ? ` a ${item.place}` : ""}.`,
  };
}

export default function WorkPage({ params }: PageProps<"/ispirazione/[id]">) {
  return (
    <Suspense fallback={<div className="container-page py-10"><div className="aspect-[16/9] animate-pulse rounded-lg bg-muted" aria-busy="true" /></div>}>
      {params.then(({ id }) => <Work id={id} />)}
    </Suspense>
  );
}

async function Work({ id }: { id: string }) {
  const item = await getShowcaseItem(id);
  if (!item) notFound();
  const user = await getAnySessionUser();
  const liked = user ? (await getLikedIds(user.id, [item.id])).has(item.id) : false;
  const where = [item.categoryName, item.place].filter(Boolean).join(" · ");
  return (
    <div className="container-page flex flex-col gap-8 py-8 md:py-12">
      <Link href="/ispirazione" className="inline-flex items-center gap-1.5 self-start text-body-s font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Torna a Ispirazione
      </Link>

      <ProjectGallery photos={item.photos} title={item.title} />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-12">
        <article className="flex flex-col gap-4">
          <p className="text-caption font-bold tracking-wide text-ink-2 uppercase">{where}</p>
          <h1 className="font-display text-h1 md:text-display-l">{item.title}</h1>
          <LikeButton itemId={item.id} liked={liked} count={item.likes} signedIn={!!user} loginHref={likeLoginHref(`/ispirazione/${item.id}`)} className="-ml-2.5" />
          {item.description && (
            <section aria-labelledby="descrizione" className="flex flex-col gap-2 border-t border-line pt-6">
              <h2 id="descrizione" className="text-h4 font-semibold">
                Il lavoro
              </h2>
              <p className="max-w-prose text-body-l whitespace-pre-line text-ink-2">{item.description}</p>
            </section>
          )}
        </article>

        <aside className="flex flex-col gap-4 self-start rounded-lg border border-line bg-surface p-6 lg:sticky lg:top-24">
          <div className="flex flex-col gap-1">
            <p className="text-caption font-bold tracking-wide text-ink-2 uppercase">Lavoro di</p>
            <h2 className="text-h3 font-semibold">{item.partnerName}</h2>
            <p className="text-body-s text-ink-2">{where}</p>
          </div>
          <p className="text-body-s">Ti piace questo lavoro? Chiedi all&apos;azienda un preventivo per il tuo: è gratis e senza impegno.</p>
          <ButtonLink href={`/richiesta/${item.partnerSlug}`}>Richiedi contatto</ButtonLink>
          <ButtonLink href={item.href} variant="secondary">
            Vedi la scheda dell&apos;azienda
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}
