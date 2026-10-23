import Link from "next/link";
import { ChevronRight, Info, SlidersHorizontal } from "lucide-react";
import { Geco } from "@/components/site/geco";
import { PartnerCard } from "@/components/site/partner-card";
import { Button } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { Input, Select } from "@/components/ui/field";
import { findPlace, getCategories, getCategoryBySlug, getMunicipalities, getServicesForCategory } from "@/lib/data/catalog";
import { searchPartners, type SortKey } from "@/lib/data/search";

export type ResultsParams = {
  categoria?: string;
  dove?: string;
  servizio?: string;
  voto?: string;
  ordina?: string;
};

const SORTS: { value: SortKey; label: string }[] = [
  { value: "rilevanza", label: "Rilevanza" },
  { value: "valutazione", label: "Valutazione" },
  { value: "recensioni", label: "Numero di recensioni" },
  { value: "distanza", label: "Distanza" },
  { value: "prezzo", label: "Prezzo indicativo" },
];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseResultsParams(sp: Record<string, string | string[] | undefined>): ResultsParams {
  return {
    categoria: first(sp.categoria),
    dove: first(sp.dove),
    servizio: first(sp.servizio),
    voto: first(sp.voto),
    ordina: first(sp.ordina),
  };
}

/** Pagina risultati condivisa da Trova Casa (agenzie) e Trova Professionista (PRD §5.2, §5.3). */
export async function Results({ mode, params }: { mode: "agency" | "pro"; params: ResultsParams }) {
  const basePath = mode === "agency" ? "/trova-casa" : "/trova-professionista";
  const [allCategories, place] = await Promise.all([getCategories(), findPlace(params.dove)]);
  const category =
    mode === "agency" ? allCategories.find((c) => c.partnerType === "agency") ?? null : params.categoria ? await getCategoryBySlug(params.categoria) : null;
  const categoryServices = category ? await getServicesForCategory(category.id) : [];
  const service = categoryServices.find((s) => s.slug === params.servizio) ?? null;
  const minRating = params.voto ? Number(params.voto.replace(",", ".")) : undefined;
  const sort = (SORTS.find((s) => s.value === params.ordina)?.value ?? "rilevanza") as SortKey;

  const { sponsored, results } = await searchPartners({
    partnerType: mode,
    categoryId: category?.id,
    serviceId: service?.id,
    place,
    minRating,
    sort,
  });
  const places = await getMunicipalities();

  const href = (patch: Partial<ResultsParams>) => {
    const next = { ...params, ...patch };
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const what = mode === "agency" ? "Agenzie immobiliari" : category?.pluralName ?? "Professionisti e artigiani";
  const where = place ? `a ${place.name}` : "in Veneto";
  const total = sponsored.length + results.length;
  const proCategories = allCategories.filter((c) => c.partnerType !== "agency");

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <nav aria-label="Percorso" className="flex flex-wrap items-center gap-1 text-body-s text-ink-2">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href={basePath} className="hover:text-primary">
          {mode === "agency" ? "Trova Casa" : "Trova Professionista"}
        </Link>
        {category && mode === "pro" && (
          <>
            <ChevronRight className="size-3.5" aria-hidden />
            <span>{category.name}</span>
          </>
        )}
        {place && (
          <>
            <ChevronRight className="size-3.5" aria-hidden />
            <span>{place.name}</span>
          </>
        )}
      </nav>

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h1">
          {what} {where}
        </h1>
        <p className="text-body text-ink-2">
          {total} {total === 1 ? "risultato" : "risultati"}
          {mode === "pro" && " · prezzi indicativi pubblicati dai partner"}
          {mode === "agency" && " · valutazioni verificate e portfolio immobili"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          id="filtri"
          aria-label="Filtri"
          className="order-2 flex scroll-mt-20 flex-col gap-6 self-start rounded-lg border border-line bg-surface p-5 lg:order-1"
        >
          <h2 className="flex items-center gap-2 text-h4 font-semibold">
            <SlidersHorizontal className="size-4" aria-hidden /> Filtri
          </h2>

          <form action={basePath} method="get" className="flex flex-col gap-3">
            {category && mode === "pro" && <input type="hidden" name="categoria" value={category.slug} />}
            {service && <input type="hidden" name="servizio" value={service.slug} />}
            {params.voto && <input type="hidden" name="voto" value={params.voto} />}
            <label htmlFor="dove" className="text-body-s font-semibold">
              Zona
            </label>
            <Input id="dove" name="dove" list="comuni-filtro" defaultValue={place?.name ?? params.dove ?? ""} placeholder="Comune" />
            <datalist id="comuni-filtro">
              {places.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
            <label htmlFor="ordina" className="text-body-s font-semibold">
              Ordina per
            </label>
            <Select id="ordina" name="ordina" defaultValue={sort}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value} disabled={s.value === "distanza" && !place}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" size="s">
              Applica
            </Button>
          </form>

          {mode === "pro" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body-s font-semibold">Tipo di professionista</legend>
              <div className="flex flex-wrap gap-2">
                <ChipLink href={href({ categoria: undefined, servizio: undefined })} selected={!category}>
                  Tutti
                </ChipLink>
                {proCategories.map((c) => (
                  <ChipLink key={c.id} href={href({ categoria: c.slug, servizio: undefined })} selected={category?.id === c.id}>
                    {c.name}
                  </ChipLink>
                ))}
              </div>
            </fieldset>
          )}

          {categoryServices.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body-s font-semibold">{mode === "agency" ? "Cosa ti serve" : "Lavoro specifico"}</legend>
              <div className="flex flex-wrap gap-2">
                {categoryServices.map((s) => (
                  <ChipLink
                    key={s.id}
                    href={href({ servizio: service?.id === s.id ? undefined : s.slug })}
                    selected={service?.id === s.id}
                  >
                    {s.name}
                  </ChipLink>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-body-s font-semibold">Valutazione minima</legend>
            <div className="flex flex-wrap gap-2">
              {[
                ["", "Tutte"],
                ["4", "4+"],
                ["4.5", "4,5+"],
              ].map(([v, l]) => (
                <ChipLink key={l} href={href({ voto: v || undefined })} selected={(params.voto ?? "") === v}>
                  {l}
                </ChipLink>
              ))}
            </div>
          </fieldset>

          <p id="ordinamento" className="flex gap-2 rounded-md bg-subtle p-3 text-caption text-ink-2">
            <Info className="size-4 shrink-0" aria-hidden />
            <span>
              Come ordiniamo: pertinenza di zona, valutazione ponderata, completezza della scheda, tempo di risposta e piano.
              I posti sponsorizzati sono separati ed etichettati.{" "}
              <Link href="/come-funziona#ordinamento" className="font-semibold text-primary underline">
                Dettagli
              </Link>
            </span>
          </p>
        </aside>

        <section aria-label="Risultati" className="order-1 flex flex-col gap-4 lg:order-2">
          <a
            href="#filtri"
            className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface px-4 py-2 text-body-s font-semibold lg:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden /> Filtri e ordinamento
          </a>
          {sponsored.length > 0 && (
            <>
              <h2 className="caps-label text-ink-2">Sponsorizzato</h2>
              {sponsored.map((p) => (
                <PartnerCard key={p.id} p={p} />
              ))}
              <h2 className="caps-label mt-2 text-ink-2">
                {results.length} {results.length === 1 ? "risultato" : "risultati"}
              </h2>
            </>
          )}
          {results.map((p) => (
            <PartnerCard key={p.id} p={p} />
          ))}
          {total === 0 && (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface p-10 text-center">
              <Geco outfit="pensa" size={120} />
              <h2 className="text-h3 font-semibold">Nessun risultato con questi filtri</h2>
              <p className="max-w-md text-body-s text-ink-2">
                Prova ad allargare la zona o a togliere un filtro. Stiamo attivando nuovi partner in tutto il Veneto.
              </p>
              <Link href={basePath} className="font-semibold text-primary underline">
                Azzera i filtri
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="container-page flex flex-col gap-6 py-8" aria-busy="true" aria-label="Caricamento dei risultati">
      <div className="h-5 w-64 animate-pulse rounded bg-muted" />
      <div className="h-10 w-96 max-w-full animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
