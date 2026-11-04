import Link from "next/link";
import {
  ArrowRight,
  BrickWall,
  DraftingCompass,
  Droplet,
  FileCheck,
  House,
  KeyRound,
  Landmark,
  PaintRoller,
  Ruler,
  Tag,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Geco, type GecoOutfit } from "@/components/site/geco";
import { getCategories } from "@/lib/data/catalog";
import { cn } from "@/lib/utils";

type TileData = { key: string; label: string; note: string; href: string; icon: LucideIcon };

const PRO_ICONS: Record<string, LucideIcon> = {
  idraulico: Droplet,
  elettricista: Zap,
  geometra: Ruler,
  architetto: DraftingCompass,
  imbianchino: PaintRoller,
  ristrutturazioni: BrickWall,
};

/** Riga sotto il nome della categoria: cosa fanno, in parole semplici. */
const PRO_NOTES: Record<string, string> = {
  idraulico: "Bagni, caldaie e perdite",
  elettricista: "Impianti e fotovoltaico",
  geometra: "APE, catasto e pratiche",
  architetto: "Progetti e interni",
  imbianchino: "Pareti e cappotto",
  ristrutturazioni: "Lavori chiavi in mano",
};

/**
 * Lato casa: i servizi delle agenzie più i due partner che servono a chi compra, vende o affitta
 * (consulenti mutui e APE dei geometri, PRD §5.2 "partner B2B nel percorso Trova Casa").
 */
const HOME_TILES: (TileData & { needs?: string })[] = [
  { key: "comprare", label: "Comprare casa", note: "Agenzie della tua zona", href: "/trova-casa?servizio=compravendita", icon: KeyRound },
  { key: "vendere", label: "Vendere casa", note: "Valutazione e vendita", href: "/trova-casa?servizio=valutazione", icon: Tag },
  { key: "affittare", label: "Affittare", note: "Cercare o dare in affitto", href: "/trova-casa?servizio=affitti", icon: House },
  {
    key: "mutuo",
    label: "Mutuo per la casa",
    note: "Consulenti del credito",
    href: "/trova-professionista?categoria=consulente-mutui",
    icon: Landmark,
    needs: "consulente-mutui",
  },
  {
    key: "ape",
    label: "Certificato APE",
    note: "Per vendere o affittare",
    href: "/trova-professionista?categoria=geometra&servizio=ape",
    icon: FileCheck,
    needs: "geometra",
  },
];

/** Tessere per lato: cinque voci più "Tutti", così i due riquadri hanno la stessa misura. */
const PER_SIDE = 5;

/**
 * I due grandi accessi della Home (PRD §5.1) come due riquadri gemelli di tessere (componente "Tile categoria"):
 * professionisti a sinistra, casa e agenzie a destra.
 */
export async function EntryBlocks({ id }: { id: string }) {
  const categories = await getCategories();
  const available = new Set(categories.map((c) => c.slug));

  // Le categorie di tecnici e artigiani con più partner attivi, a parità nell'ordine del catalogo.
  const pro: TileData[] = categories
    .filter((c) => c.partnerType === "technician" || c.partnerType === "artisan")
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.partnerCount - a.c.partnerCount || a.i - b.i)
    .slice(0, PER_SIDE)
    .map(({ c }) => ({
      key: c.slug,
      label: c.pluralName,
      note: PRO_NOTES[c.slug] ?? (c.partnerCount === 1 ? "1 partner" : `${c.partnerCount} partner`),
      href: `/trova-professionista?categoria=${c.slug}`,
      icon: PRO_ICONS[c.slug] ?? Wrench,
    }));
  const home = HOME_TILES.filter((t) => !t.needs || available.has(t.needs)).slice(0, PER_SIDE);

  return (
    <section aria-labelledby={id} className="container-page pt-24 pb-28 md:pt-32 md:pb-36">
      <div data-reveal className="mb-20 grid grid-cols-1 items-end gap-4 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-10">
        <h2 id={id} className="scroll-mt-28 font-display text-[2.25rem] leading-[1.08] tracking-[-0.02em] md:text-display-l">
          Cosa stai cercando?
        </h2>
        <p className="max-w-xl text-body-l text-neutro-700">
          Un lavoro in casa o una casa nuova: parti da qui e confronta chi lavora davvero nella tua zona.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-20 lg:grid-cols-2">
        <Panel
          tone="white"
          title="Trova un professionista"
          text="Prezzi indicativi e recensioni solo da clienti verificati."
          tiles={pro}
          all={{ href: "/trova-professionista", label: "Tutti i professionisti" }}
          outfit="professionista"
        />
        <Panel
          tone="sage"
          title="Trova un'agenzia"
          text="Comprare, vendere o affittare, con chi conosce la zona."
          tiles={home}
          all={{ href: "/trova-casa", label: "Tutte le agenzie" }}
          outfit="casa"
        />
      </div>
    </section>
  );
}

function Panel(props: {
  tone: "white" | "sage";
  title: string;
  text: string;
  tiles: TileData[];
  all: { href: string; label: string };
  outfit: GecoOutfit;
}) {
  const sage = props.tone === "sage";
  return (
    <div data-reveal className={cn("relative rounded-xl p-6 md:p-8", sage ? "bg-brand-soft [--reveal-shift:8%]" : "bg-surface")}>
      <Geco outfit={props.outfit} size={104} className="pointer-events-none absolute -top-[60px] right-5 md:right-8" />
      <h3 className="pr-24 font-display text-h1 tracking-[-0.02em] sm:pr-28">{props.title}</h3>
      <p className="mt-2 max-w-md pr-16 text-body text-neutro-700 sm:pr-0">{props.text}</p>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {props.tiles.map((t) => (
          <li key={t.key}>
            <Tile tile={t} sage={sage} />
          </li>
        ))}
        <li>
          <Link
            href={props.all.href}
            className={cn(
              "group/tile flex h-full min-h-[10rem] flex-col justify-between gap-4 rounded-lg p-4 text-on-brand transition-[background-color,transform] duration-200 hover:-translate-y-0.5",
              sage ? "bg-primary hover:bg-primary-hover" : "bg-brand hover:bg-bosco-700",
            )}
          >
            <span className="text-body font-semibold">{props.all.label}</span>
            <ArrowRight className="size-6 transition-transform duration-200 group-hover/tile:translate-x-1" aria-hidden />
          </Link>
        </li>
      </ul>
    </div>
  );
}

function Tile({ tile, sage }: { tile: TileData; sage: boolean }) {
  const Icon = tile.icon;
  return (
    <Link
      href={tile.href}
      className={cn(
        "group/tile flex h-full min-h-[10rem] flex-col justify-between gap-4 rounded-lg p-4 transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-brand hover:text-on-brand",
        sage ? "bg-surface/70" : "bg-page",
      )}
    >
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-subtle text-primary transition-colors group-hover/tile:bg-bosco-800 group-hover/tile:text-on-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-body font-semibold">{tile.label}</span>
        <span className="text-body-s text-ink-2 transition-colors group-hover/tile:text-salvia-200">{tile.note}</span>
      </span>
    </Link>
  );
}
