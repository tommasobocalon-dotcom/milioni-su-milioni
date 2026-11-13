import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { connection } from "next/server";
import { LikeButton } from "@/components/site/like-button";
import { Badge } from "@/components/ui/badge";
import { ChipLink } from "@/components/ui/chip";
import { LogoPartner } from "@/components/ui/logo-partner";
import { getAnySessionUser } from "@/lib/auth/session";
import { getCategories } from "@/lib/data/catalog";
import { getLikedIds, getShowcase, type ShowcaseItem } from "@/lib/data/showcase";
import { likeLoginHref } from "@/lib/domain/likes";
import { parseShowcaseFilter, showcaseHref } from "@/lib/domain/showcase-filter";

export const metadata: Metadata = {
  title: "Ispirazione",
  description: "Lavori veri di artigiani, tecnici e agenzie del Veneto: bagni, cucine, facciate, case. Idee per il tuo progetto.",
};

export default function InspirationPage({ searchParams }: PageProps<"/ispirazione">) {
  return (
    <>
      <section className="bg-brand text-on-brand">
        <div className="container-page flex flex-col gap-6 py-10 md:py-14">
          <div className="flex max-w-2xl flex-col gap-3">
            <h1 className="font-display text-h1 md:text-display-l">Ispirazione</h1>
            <p className="text-body-l text-on-brand-muted">
              Lavori fatti da chi trovi su geco. Scorri, metti mi piace a quelli che ti convincono e apri un progetto per vedere tutte le foto e chiedere un contatto all&apos;azienda.
            </p>
          </div>
          <Suspense fallback={<div className="h-20" aria-hidden />}>
            <Filters searchParams={searchParams} />
          </Suspense>
          <p className="text-body-s text-on-brand-muted">
            Sei un&apos;azienda?{" "}
            <Link href="/area-partner/lavori" className="font-semibold text-on-brand underline underline-offset-2 hover:text-salvia-200">
              Pubblica i tuoi lavori
            </Link>{" "}
            dall&apos;Area Partner: fino a 5 con il piano Base, 25 con il Normal, senza limiti con il Premium.
          </p>
        </div>
      </section>
      <div className="container-page flex flex-col gap-10 py-10 md:py-14">
        <Suspense fallback={<div className="mx-auto h-[36rem] w-full max-w-xl animate-pulse rounded-lg bg-muted" aria-busy="true" />}>
          <Showcase searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

type Search = PageProps<"/ispirazione">["searchParams"];

async function readFilter(searchParams: Search) {
  const [params, categories] = await Promise.all([searchParams, getCategories()]);
  const pros = categories.filter((c) => c.partnerType !== "agency");
  return { filter: parseShowcaseFilter(params, pros.map((c) => c.slug)), pros };
}

/** Filtri come link: Tutti / Professionisti / Agenzie, poi il tipo di professionista o l'operazione dell'agenzia. */
async function Filters({ searchParams }: { searchParams: Search }) {
  const { filter, pros } = await readFilter(searchParams);
  const sub =
    filter.type === "pro"
      ? pros.map((c) => ({ label: c.pluralName, href: showcaseHref({ type: "pro", categorySlug: c.slug }), on: filter.categorySlug === c.slug }))
      : filter.type === "agency"
        ? [
            { label: "In vendita", href: showcaseHref({ type: "agency", contract: "sale" }), on: filter.contract === "sale" },
            { label: "In affitto", href: showcaseHref({ type: "agency", contract: "rent" }), on: filter.contract === "rent" },
          ]
        : [];
  return (
    <nav aria-label="Filtra i lavori" className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2">
        {[
          { label: "Tutti", href: showcaseHref({}), on: !filter.type },
          { label: "Professionisti", href: showcaseHref({ type: "pro" }), on: filter.type === "pro" },
          { label: "Agenzie", href: showcaseHref({ type: "agency" }), on: filter.type === "agency" },
        ].map((f) => (
          <li key={f.label}>
            <ChipLink href={f.href} selected={f.on} scroll={false}>
              {f.label}
            </ChipLink>
          </li>
        ))}
      </ul>
      {sub.length > 0 && (
        <ul aria-label={filter.type === "pro" ? "Tipo di professionista" : "Operazione"} className="flex flex-wrap gap-2 border-t border-bosco-700 pt-3">
          {sub.map((f) => (
            <li key={f.label}>
              <ChipLink href={f.href} selected={f.on} scroll={false}>
                {f.label}
              </ChipLink>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

async function Showcase({ searchParams }: { searchParams: Search }) {
  await connection();
  const { filter } = await readFilter(searchParams);
  const [{ featured, latest }, user] = await Promise.all([getShowcase(new Date(), filter), getAnySessionUser()]);
  if (featured.length + latest.length === 0) {
    return filter.type ? (
      <p className="rounded-lg bg-subtle p-8 text-center text-body">
        Ancora nessun lavoro con questo filtro.{" "}
        <Link href="/ispirazione" className="font-semibold text-primary underline underline-offset-2 hover:text-primary-hover">
          Vedi tutti i lavori
        </Link>
      </p>
    ) : (
      <p className="rounded-lg bg-subtle p-8 text-center text-body">Le aziende stanno caricando i primi lavori: torna presto.</p>
    );
  }
  const liked = user ? await getLikedIds(user.id, [...featured, ...latest].map((i) => i.id)) : new Set<string>();
  // Chi non ha fatto l'accesso passa dal login e torna a questa pagina, con gli stessi filtri.
  const viewer = { signedIn: !!user, loginHref: likeLoginHref(showcaseHref(filter)) };
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-10">
      {featured.length > 0 && (
        <section aria-labelledby="in-evidenza" className="flex flex-col gap-4">
          <h2 id="in-evidenza" className="text-h3 font-semibold">
            In evidenza
          </h2>
          <ul className="flex flex-col gap-8">
            {featured.map((item) => (
              <FeedPost key={item.id} item={item} liked={liked.has(item.id)} viewer={viewer} />
            ))}
          </ul>
        </section>
      )}
      {latest.length > 0 && (
        <section aria-labelledby="ultimi-lavori" className="flex flex-col gap-4">
          <h2 id="ultimi-lavori" className="text-h3 font-semibold">
            Ultimi lavori
          </h2>
          <ul className="flex flex-col gap-8">
            {latest.map((item) => (
              <FeedPost key={item.id} item={item} liked={liked.has(item.id)} viewer={viewer} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Un lavoro nel feed (13/11/2026): in testa l'azienda, poi la foto principale, il "mi piace" e il testo. Tutto il
 * riquadro porta alla pagina del lavoro (link del titolo allargato con ::after); azienda e "mi piace" restano
 * cliccabili a parte, sopra. Nel feed una sola foto: tutte le altre sono nella pagina del lavoro.
 */
function FeedPost({ item, liked, viewer }: { item: ShowcaseItem; liked: boolean; viewer: { signedIn: boolean; loginHref: string } }) {
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-primary">
      <div className="flex items-center gap-3 p-4">
        <Link href={item.href} className="relative z-10 flex min-w-0 items-center gap-3 rounded-md hover:underline">
          <LogoPartner name={item.partnerName} src={item.partnerLogoUrl} size={40} className="rounded-full" />
          <span className="truncate text-body font-semibold text-ink">{item.partnerName}</span>
        </Link>
        {item.sponsored && <Badge kind="sponsored" className="ml-auto shrink-0" />}
      </div>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={item.photos[0]}
          alt={item.title}
          fill
          sizes="(min-width: 640px) 576px, 100vw"
          className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
        />
        {item.photos.length > 1 && (
          <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-ink/75 px-2.5 py-0.5 text-caption font-semibold text-on-brand">
            {item.photos.length} foto
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-2 pt-2 pr-4">
        <LikeButton itemId={item.id} liked={liked} count={item.likes} signedIn={viewer.signedIn} loginHref={viewer.loginHref} />
        <span aria-hidden className="inline-flex items-center gap-1 text-body-s font-semibold text-primary">
          Scopri <ArrowRight className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-4 pt-1 pb-5">
        <p className="text-caption font-bold tracking-wide text-ink-2 uppercase">
          {item.categoryName}
          {item.place && ` · ${item.place}`}
        </p>
        <h3 className="text-h4 font-semibold">
          <Link href={`/ispirazione/${item.id}`} className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-lg after:focus-visible:outline-2 after:focus-visible:outline-primary">
            {item.title}
          </Link>
        </h3>
        {item.description && <p className="line-clamp-3 text-body-s text-ink-2">{item.description}</p>}
      </div>
    </li>
  );
}
