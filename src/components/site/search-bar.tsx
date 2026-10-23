import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMunicipalities } from "@/lib/data/catalog";
import { cn } from "@/lib/utils";

/** Barra di ricerca unica: "cosa ti serve" + "dove" (PRD §5.1). Funziona anche senza JavaScript. */
export async function SearchBar({ defaultWhat, defaultWhere, className }: { defaultWhat?: string; defaultWhere?: string; className?: string }) {
  const places = await getMunicipalities();
  return (
    <form
      action="/cerca"
      method="get"
      role="search"
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-line bg-surface p-2 shadow-float md:flex-row md:items-center md:gap-0",
        className,
      )}
    >
      <label className="flex flex-1 items-center gap-3 px-3 py-1.5">
        <Search className="size-5 shrink-0 text-ink-2" aria-hidden />
        <span className="flex flex-1 flex-col">
          <span className="text-caption font-semibold text-ink-2">Cosa ti serve?</span>
          <input
            name="q"
            defaultValue={defaultWhat}
            placeholder="Es. rifare il bagno, APE, vendere casa"
            className="w-full bg-transparent text-body text-ink placeholder:text-ink-3 focus:outline-none"
            autoComplete="off"
          />
        </span>
      </label>
      <span aria-hidden className="hidden h-10 w-px bg-line md:block" />
      <label className="flex flex-1 items-center gap-3 px-3 py-1.5 md:max-w-xs">
        <MapPin className="size-5 shrink-0 text-ink-2" aria-hidden />
        <span className="flex flex-1 flex-col">
          <span className="text-caption font-semibold text-ink-2">Dove?</span>
          <input
            name="dove"
            list="comuni-veneto"
            defaultValue={defaultWhere}
            placeholder="Comune, es. Padova o Mestre"
            className="w-full bg-transparent text-body text-ink placeholder:text-ink-3 focus:outline-none"
            autoComplete="off"
          />
        </span>
      </label>
      <datalist id="comuni-veneto">
        {places.map((p) => (
          <option key={p.id} value={`${p.name} (${p.provinceCode})`} />
        ))}
      </datalist>
      <Button type="submit" className="md:ml-2">
        Cerca
        <Search aria-hidden />
      </Button>
    </form>
  );
}
