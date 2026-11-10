import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getCategories } from "@/lib/data/catalog";
import { cn } from "@/lib/utils";

type Shortcut = { label: string; href: string };

/** Scorciatoie del lato agenzie: i servizi più cercati da chi compra, vende o affitta. */
const HOME_SHORTCUTS: Shortcut[] = [
  { label: "Comprare", href: "/trova-casa?servizio=compravendita" },
  { label: "Vendere", href: "/trova-casa?servizio=valutazione" },
  { label: "Affittare", href: "/trova-casa?servizio=affitti" },
];

/**
 * I due grandi accessi della Home (PRD §5.1): professionisti a sinistra, agenzie a destra.
 * Ogni blocco ha una foto del mestiere (fornita dal cliente, in `public/foto/home/`), titolo, descrizione, scorciatoie e il bottone della ricerca.
 */
export async function EntryBlocks({ id }: { id: string }) {
  const categories = await getCategories();

  // Le categorie di tecnici e artigiani con più partner attivi, a parità nell'ordine del catalogo.
  const proShortcuts: Shortcut[] = categories
    .filter(
      (c) => c.partnerType === "technician" || c.partnerType === "artisan",
    )
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.partnerCount - a.c.partnerCount || a.i - b.i)
    .slice(0, 3)
    .map(({ c }) => ({
      label: c.pluralName,
      href: `/trova-professionista?categoria=${c.slug}`,
    }));

  return (
    <section aria-labelledby={id} className="bg-surface">
      <div className="container-page pt-24 pb-28 md:pt-32 md:pb-36">
        <div
          data-reveal
          className="mb-20 flex flex-col items-center gap-4 text-center"
        >
          <h2
            id={id}
            className="scroll-mt-28 font-display text-[2.25rem] leading-[1.08] tracking-[-0.02em] md:text-display-l"
          >
            Cosa stai cercando?
          </h2>
          <p className="max-w-xl text-body-l text-neutro-700">
            Un lavoro in casa o una casa nuova: parti da qui e confronta chi
            lavora davvero nella tua zona.
          </p>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 md:gap-20">
          <Block
            tone="sage"
            photo={{
              src: "/foto/home/professionisti-card-v2.jpg",
              alt: "Artigiano che monta una finestra in una stanza in ristrutturazione",
            }}
            label="Tecnici e artigiani"
            title="Cerca professionisti"
            text="Geometri, tecnici e artigiani della tua zona, con prezzi indicativi e recensioni solo da clienti verificati."
            shortcuts={proShortcuts}
            href="/trova-professionista"
            cta="Cerca un professionista"
          />
          <Block
            tone="sage"
            photo={{
              src: "/foto/home/agenzia-card.jpg",
              alt: "Agente immobiliare sorridente con il portatile sotto il braccio",
              position: "object-[50%_15%]",
            }}
            label="Agenzie immobiliari"
            title="Cerca agenzie"
            text="Comprare, vendere o affittare casa con le agenzie immobiliari che conoscono la zona."
            shortcuts={HOME_SHORTCUTS}
            href="/trova-casa"
            cta="Cerca un'agenzia"
          />
        </div>
      </div>
    </section>
  );
}

function Block(props: {
  tone: "white" | "sage";
  /** `position`: classe object-position per scegliere quale parte della foto resta nel riquadro 4:3. */
  photo: { src: string; alt: string; position?: string };
  label: string;
  title: string;
  text: string;
  shortcuts: Shortcut[];
  href: string;
  cta: string;
}) {
  const sage = props.tone === "sage";
  return (
    <article
      data-reveal
      className={cn(
        "group/block flex flex-col rounded-xl p-3",
        sage ? "sage-wash [--reveal-shift:8%]" : "bg-surface",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        <Image
          src={props.photo.src}
          alt={props.photo.alt}
          fill
          sizes="(min-width: 896px) 430px, (min-width: 640px) 50vw, 100vw"
          className={cn(
            "object-cover transition-transform duration-700 ease-out motion-safe:group-hover/block:scale-[1.04]",
            props.photo.position,
          )}
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-3 pt-6 pb-3 md:px-5 md:pt-7 md:pb-5">
        <p className="caps-label text-primary">{props.label}</p>
        <h3 className="font-display text-h1 tracking-[-0.02em]">
          {props.title}
        </h3>
        <p className="text-body text-neutro-700">{props.text}</p>
        <ul aria-label="Scorciatoie" className="mt-1 flex flex-wrap gap-2">
          {props.shortcuts.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-body-s font-medium text-brand transition-colors",
                  sage
                    ? "bg-surface hover:bg-subtle"
                    : "bg-subtle hover:bg-brand-soft",
                )}
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-6">
          <ButtonLink href={props.href}>
            {props.cta}{" "}
            <ArrowRight
              className="transition-transform duration-200 group-hover/block:translate-x-0.5"
              aria-hidden
            />
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
