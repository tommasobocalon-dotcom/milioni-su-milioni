import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ProjectPhotos } from "@/components/site/project-photos";
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
          Lavori fatti da chi trovi su geco. Se ti piace un progetto, apri la scheda dell&apos;azienda e chiedi un contatto.
        </p>
        <p className="text-body-s text-ink-2">
          Sei un&apos;azienda?{" "}
          <Link href="/area-partner/scheda" className="font-semibold text-primary hover:underline">
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

function ShowcaseCard({ item, large }: { item: ShowcaseItem; large?: boolean }) {
  return (
    <li className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        <ProjectPhotos
          photos={item.photos}
          title={item.title}
          sizes={large ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
        />
      </div>
      {item.sponsored && <Badge kind="sponsored" className="self-start" />}
      <div className="flex flex-col gap-1">
        <h3 className={large ? "text-h3 font-semibold" : "text-h4 font-semibold"}>{item.title}</h3>
        {item.description && <p className={large ? "text-body-s text-ink-2" : "line-clamp-3 text-body-s text-ink-2"}>{item.description}</p>}
        <p className="text-body-s text-ink-2">
          <Link href={item.href} className="font-semibold text-primary hover:underline">
            {item.partnerName}
          </Link>{" "}
          · {item.categoryName}
          {item.place && ` · ${item.place}`}
        </p>
      </div>
    </li>
  );
}
