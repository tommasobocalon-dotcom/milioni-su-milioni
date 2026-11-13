import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { getShowcase, type ShowcaseItem } from "@/lib/data/showcase";

export const metadata: Metadata = {
  title: "Ispirazione",
  description: "Lavori veri di artigiani, tecnici e agenzie del Veneto: bagni, cucine, facciate, case. Idee per il tuo progetto.",
};

export default function InspirationPage() {
  return (
    <div className="container-page flex flex-col gap-10 py-10 md:py-14">
      <header className="flex max-w-2xl flex-col gap-2">
        <h1 className="font-display text-h1 md:text-display-l">Ispirazione</h1>
        <p className="text-body-l text-ink-2">
          Lavori fatti da chi trovi su geco. Apri un progetto per vedere tutte le foto e, se ti piace, chiedi un contatto all&apos;azienda.
        </p>
        <p className="text-body-s text-ink-2">
          Sei un&apos;azienda?{" "}
          <Link href="/area-partner/lavori" className="font-semibold text-primary hover:underline">
            Pubblica i tuoi lavori
          </Link>{" "}
          dall&apos;Area Partner: fino a 5 con il piano Base, 25 con il Normal, senza limiti con il Premium.
        </p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" aria-busy="true" />}>
        <Showcase />
      </Suspense>
    </div>
  );
}

async function Showcase() {
  await connection();
  const { featured, latest } = await getShowcase(new Date());
  if (featured.length + latest.length === 0) {
    return <p className="rounded-lg bg-subtle p-8 text-center text-body">Le aziende stanno caricando i primi lavori: torna presto.</p>;
  }
  return (
    <>
      {featured.length > 0 && (
        <section aria-labelledby="in-evidenza" className="flex flex-col gap-4">
          <h2 id="in-evidenza" className="text-h3 font-semibold">
            In evidenza
          </h2>
          <ul className="grid gap-6 md:grid-cols-2">
            {featured.map((item) => (
              <ShowcaseCard key={item.id} item={item} large />
            ))}
          </ul>
        </section>
      )}
      {latest.length > 0 && (
        <section aria-labelledby="ultimi-lavori" className="flex flex-col gap-4">
          <h2 id="ultimi-lavori" className="text-h3 font-semibold">
            Ultimi lavori
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((item) => (
              <ShowcaseCard key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/**
 * Riquadro di un lavoro: solo la foto principale, tutto il riquadro porta alla pagina del lavoro (link del titolo
 * allargato con ::after); il nome dell'azienda resta un link a parte, sopra.
 */
function ShowcaseCard({ item, large }: { item: ShowcaseItem; large?: boolean }) {
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-primary">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={item.photos[0]}
          alt={item.title}
          fill
          sizes={large ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
          className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
        />
        {item.photos.length > 1 && (
          <span className="pointer-events-none absolute right-2 bottom-2 rounded-full bg-ink/75 px-2 py-0.5 text-caption font-semibold text-on-brand">
            {item.photos.length} foto
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {item.sponsored && <Badge kind="sponsored" className="self-start" />}
        <p className="text-caption font-bold tracking-wide text-ink-2 uppercase">
          {item.categoryName}
          {item.place && ` · ${item.place}`}
        </p>
        <h3 className={large ? "text-h3 font-semibold" : "text-h4 font-semibold"}>
          <Link href={`/ispirazione/${item.id}`} className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-lg after:focus-visible:outline-2 after:focus-visible:outline-primary">
            {item.title}
          </Link>
        </h3>
        {item.description && <p className="line-clamp-2 text-body-s text-ink-2">{item.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3 text-body-s">
          <Link href={item.href} className="relative z-10 font-semibold text-ink hover:text-primary hover:underline">
            {item.partnerName}
          </Link>
          <span aria-hidden className="inline-flex items-center gap-1 font-semibold text-primary">
            Scopri <ArrowRight className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </li>
  );
}
