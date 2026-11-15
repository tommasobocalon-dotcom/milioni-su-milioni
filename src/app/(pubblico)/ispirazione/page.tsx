import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { ChipLink } from "@/components/ui/chip";
import { ProjectPhotos } from "@/components/site/project-photos";
import { getCategories } from "@/lib/data/catalog";
import { getShowcase, type ShowcaseItem } from "@/lib/data/showcase";
import { PROPERTY_CONTRACTS } from "@/lib/domain/property-contract";
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
              Lavori fatti da chi trovi su geco. Apri un progetto per vedere tutte le foto e, se ti piace, chiedi un contatto all&apos;azienda.
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
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" aria-busy="true" />}>
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
        ? PROPERTY_CONTRACTS.map((c) => ({ label: c.badge, href: showcaseHref({ type: "agency", contract: c.value }), on: filter.contract === c.value }))
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
  const { featured, latest } = await getShowcase(new Date(), filter);
  if (featured.length + latest.length === 0) {
    return filter.type ? (
      <p className="rounded-lg bg-subtle p-8 text-center text-body">
        Ancora nessun lavoro con questo filtro.{" "}
        <Link href="/ispirazione" className="font-semibold text-on-brand underline underline-offset-2 hover:text-salvia-200">
          Vedi tutti i lavori
        </Link>
      </p>
    ) : (
      <p className="rounded-lg bg-subtle p-8 text-center text-body">Le aziende stanno caricando i primi lavori: torna presto.</p>
    );
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
 * Riquadro di un lavoro: foto che si scorrono di lato (13/11/2026), il resto del riquadro porta alla pagina del lavoro
 * (link del titolo allargato con ::after); il nome dell'azienda resta un link a parte, sopra.
 */
function ShowcaseCard({ item, large }: { item: ShowcaseItem; large?: boolean }) {
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-primary">
      {/* Sopra il link allargato del titolo, così le foto si scorrono; ogni foto apre comunque il lavoro. */}
      <div className="relative z-10 aspect-[4/3] overflow-hidden bg-muted">
        <ProjectPhotos
          photos={item.photos}
          title={item.title}
          href={`/ispirazione/${item.id}`}
          sizes={large ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
        />
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
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-bosco-700 pt-3 text-body-s">
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
