import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { connection } from "next/server";
import Link from "next/link";
import { Award, ChevronLeft, ChevronRight, Info, SlidersHorizontal, Sparkles, Star } from "lucide-react";
import { PartnerCard } from "@/components/site/partner-card";
import { Button } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { Input, Select } from "@/components/ui/field";
import { findZone, getCategories, getCategoryBySlug, getMunicipalities, getProvinceZones, getServicesForCategory } from "@/lib/data/catalog";
import { FeaturedPartner } from "@/components/site/featured-partner";
import { ResultsMap, type MapPoint } from "@/components/site/results-map";
import { recordImpressions, searchPartners, type SortKey } from "@/lib/data/search";
import { VISITOR_COOKIE, visitorRotation } from "@/lib/domain/ranking";
import { pageNumbers, parsePage } from "@/lib/domain/pagination";
import { cn } from "@/lib/utils";

/**
 * Schede per pagina nei risultati: 7 dalla seconda pagina in poi; la prima è più corta (5 + il riquadro grande in evidenza) così l'elenco supera
 * di poco filtri e mappa a sinistra senza lasciare spazio vuoto ai lati (richiesta del cliente, 9/11/2026).
 */
const FIRST_PAGE_SIZE = 5;
const PAGE_SIZE = 7;

export type ResultsParams = {
  categoria?: string;
  dove?: string;
  servizio?: string;
  ordina?: string;
  pagina?: string;
};

const SORTS: { value: SortKey; label: string }[] = [
  { value: "rilevanza", label: "Consigliati" },
  { value: "distanza", label: "Distanza" },
  { value: "prezzo", label: "Prezzo indicativo" },
];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseResultsParams(sp: Record<string, string | string[] | undefined>): ResultsParams {
  return {
    categoria: first(sp.categoria),
    dove: first(sp.dove),
    servizio: first(sp.servizio),
    ordina: first(sp.ordina),
    pagina: first(sp.pagina),
  };
}

/**
 * Pagina risultati condivisa da Trova Casa (agenzie) e Trova Professionista (PRD §5.2, §5.3).
 * Qui solo la parte che dipende dal visitatore: la sua rotazione dell'ordine (cookie) e le impressioni.
 * L'elenco vero (ResultsBody) è in cache per filtri + rotazione, così non si ricostruisce a ogni richiesta.
 */
export async function Results({ mode, params }: { mode: "agency" | "pro"; params: ResultsParams }) {
  const seed = visitorRotation((await cookies()).get(VISITOR_COOKIE)?.value ?? "");
  // Le impressioni si scrivono solo per le richieste vere, mai nel prerender.
  await connection();
  recordImpressions((await findResults(mode, params, seed)).found);
  return <ResultsBody mode={mode} params={params} seed={seed} />;
}

/** Filtri letti dall'indirizzo e ricerca. Le funzioni chiamate sono in cache: chiamarla due volte non rifà le query. */
async function findResults(mode: "agency" | "pro", params: ResultsParams, seed: string) {
  const [allCategories, { place, province }] = await Promise.all([getCategories(), findZone(params.dove)]);
  const category =
    mode === "agency" ? allCategories.find((c) => c.partnerType === "agency") ?? null : params.categoria ? await getCategoryBySlug(params.categoria) : null;
  const categoryServices = category ? await getServicesForCategory(category.id) : [];
  const service = categoryServices.find((s) => s.slug === params.servizio) ?? null;
  const sort = (SORTS.find((s) => s.value === params.ordina)?.value ?? "rilevanza") as SortKey;

  const found = await searchPartners({
    partnerType: mode,
    categoryId: category?.id,
    serviceId: service?.id,
    place,
    provinceId: province?.id,
    sort,
    page: parsePage(params.pagina),
    pageSize: PAGE_SIZE,
    firstPageSize: FIRST_PAGE_SIZE,
    visitorSeed: seed,
  });
  return { allCategories, place, province, category, categoryServices, service, sort, found };
}

async function ResultsBody({ mode, params, seed }: { mode: "agency" | "pro"; params: ResultsParams; seed: string }) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", "boosts");
  const basePath = mode === "agency" ? "/trova-casa" : "/trova-professionista";
  const { allCategories, place, province, category, categoryServices, service, sort, found } = await findResults(mode, params, seed);
  const { featured, results, total, page, pages } = found;
  const [places, provinceZones] = await Promise.all([getMunicipalities(), getProvinceZones()]);

  const href = (patch: Partial<ResultsParams>) => {
    // Ogni cambio di filtro riparte dalla prima pagina; solo la paginazione passa `pagina`.
    const next = { ...params, pagina: undefined, ...patch };
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  // Marker della mappa: featured + risultati con coordinate valide.
  const mapPoints: MapPoint[] = [...(featured ? [featured] : []), ...results]
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map((p) => ({ id: p.id, name: p.displayName, href: p.href, lat: p.lat, lng: p.lng }));

  const what = mode === "agency" ? "Agenzie immobiliari" : category?.pluralName ?? "Professionisti e artigiani";
  const where = place ? `a ${place.name}` : province ? `in provincia di ${province.name}` : "in Veneto";
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
        {(place || province) && (
          <>
            <ChevronRight className="size-3.5" aria-hidden />
            <span>{place?.name ?? province?.label}</span>
          </>
        )}
      </nav>

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h1">
          {what} {where}
        </h1>
        <p className="text-body text-ink-2">
          {total} {total === 1 ? "risultato" : "risultati"}
          {mode === "pro" && " · prezzi indicativi nel profilo di ogni partner"}
          {mode === "agency" && " · specializzazioni e portfolio immobili"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Colonna sinistra: filtri e, sotto, la mappa piccola dei risultati. */}
        <div className="order-2 flex flex-col gap-4 self-start lg:order-1">
          <aside
            id="filtri"
            aria-label="Filtri"
            className="flex scroll-mt-20 flex-col gap-6 rounded-lg border border-line bg-surface p-5"
          >
            <h2 className="flex items-center gap-2 text-h4 font-semibold">
              <SlidersHorizontal className="size-4" aria-hidden /> Filtri
            </h2>

            <form action={basePath} method="get" className="flex flex-col gap-3">
              {category && mode === "pro" && <input type="hidden" name="categoria" value={category.slug} />}
              {service && <input type="hidden" name="servizio" value={service.slug} />}
              <label htmlFor="dove" className="text-body-s font-semibold">
                Zona
              </label>
              <Input id="dove" name="dove" list="comuni-filtro" defaultValue={place?.name ?? province?.label ?? params.dove ?? ""} placeholder="Comune o provincia" />
              <datalist id="comuni-filtro">
                {provinceZones.map((p) => (
                  <option key={p.id} value={p.label} />
                ))}
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

            <p id="ordinamento" className="flex gap-2 rounded-md bg-subtle p-3 text-caption text-ink-2">
              <Info className="size-4 shrink-0" aria-hidden />
              <span>
                Come ordiniamo: mostriamo solo chi lavora nella zona cercata, poi prima i piani più alti (Partner Elite, fascia lilla; Partner Pro, fascia verde; poi gli altri)
                e chi ha comprato più visibilità: la sua fascia è più piena e porta l&apos;etichetta &quot;Sponsorizzato&quot;. Tra aziende dello stesso piano l&apos;ordine cambia a
                ogni visita.{" "}
                <Link href="/come-funziona#ordinamento" className="font-semibold text-primary underline">
                  Dettagli
                </Link>
              </span>
            </p>
          </aside>
          {mapPoints.length > 0 && <ResultsMap points={mapPoints} className="h-64 md:h-64" />}
        </div>

        <section aria-label="Risultati" className="order-1 flex flex-col gap-4 lg:order-2">
          <a
            href="#filtri"
            className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface px-4 py-2 text-body-s font-semibold lg:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden /> Filtri e ordinamento
          </a>
          {total > 0 && <PlanLegend />}
          {featured && <FeaturedPartner p={featured} />}
          {results.map((p) => (
            <PartnerCard key={p.id} p={p} />
          ))}
          {pages > 1 && <Pagination page={page} pages={pages} href={(n) => href({ pagina: n > 1 ? String(n) : undefined })} />}
          {total === 0 && (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface p-10 text-center">
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

/** Legenda sopra i risultati: come si riconoscono i piani e chi ha comprato visibilità (richiesta del cliente, 9/11/2026). */
function PlanLegend() {
  return (
    <ul aria-label="Legenda delle schede" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-body-s text-ink-2">
      <li className="inline-flex items-center gap-2">
        <span className="inline-flex h-6 items-center gap-1 rounded-full border border-lavanda-300 bg-tertiary px-2 text-caption font-semibold text-ink">
          <Star className="size-3.5 fill-ambra-500 text-ambra-500" aria-hidden /> Partner Elite
        </span>
        piano più alto
      </li>
      <li className="inline-flex items-center gap-2">
        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-brand-soft/40 px-2 text-caption font-semibold text-ink">
          <Award className="size-3.5 text-primary" aria-hidden /> Partner Pro
        </span>
        piano intermedio
      </li>
      <li className="inline-flex items-center gap-2">
        <span className="inline-flex h-6 items-center gap-1 rounded-full border border-line bg-surface px-2 text-caption font-semibold text-ink">
          <Sparkles className="size-3.5" aria-hidden /> Sponsorizzato
        </span>
        ha pagato per più visibilità
      </li>
    </ul>
  );
}

/** Paginazione dei risultati: frecce e numeri di pagina, con "…" quando le pagine sono tante. Solo link, funziona senza JavaScript. */
function Pagination({ page, pages, href }: { page: number; pages: number; href: (n: number) => string }) {
  const arrow = "inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-subtle";
  return (
    <nav aria-label="Pagine dei risultati" className="flex flex-col items-center gap-3 pt-4">
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} className={arrow} rel="prev">
              <ChevronLeft className="size-5" aria-hidden />
              <span className="sr-only">Pagina precedente</span>
            </Link>
          ) : (
            <span className={cn(arrow, "pointer-events-none opacity-40")} aria-hidden>
              <ChevronLeft className="size-5" />
            </span>
          )}
        </li>
        {pageNumbers(page, pages).map((n, i) => (
          <li key={`${n}-${i}`}>
            {n === "…" ? (
              <span className="inline-flex size-11 items-center justify-center text-ink-2" aria-hidden>
                …
              </span>
            ) : (
              <Link
                href={href(n)}
                aria-current={n === page ? "page" : undefined}
                aria-label={`Pagina ${n}`}
                className={cn(
                  "inline-flex size-11 items-center justify-center rounded-full text-body font-semibold transition-colors",
                  n === page ? "bg-brand text-on-brand" : "text-ink hover:bg-subtle",
                )}
              >
                {n}
              </Link>
            )}
          </li>
        ))}
        <li>
          {page < pages ? (
            <Link href={href(page + 1)} className={arrow} rel="next">
              <ChevronRight className="size-5" aria-hidden />
              <span className="sr-only">Pagina successiva</span>
            </Link>
          ) : (
            <span className={cn(arrow, "pointer-events-none opacity-40")} aria-hidden>
              <ChevronRight className="size-5" />
            </span>
          )}
        </li>
      </ul>
      <p className="text-body-s text-ink-2">
        Pagina {page} di {pages}
      </p>
    </nav>
  );
}
