import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { connection } from "next/server";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Info, SlidersHorizontal } from "lucide-react";
import { PartnerCard } from "@/components/site/partner-card";
import { Button } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { Input, Select } from "@/components/ui/field";
import { findZone, getCategories, getCategoryBySlug, getMunicipalities, getProvinceZones, getServicesForCategory } from "@/lib/data/catalog";
import { AreaRequestForm } from "@/components/site/area-request-form";
import { FeaturedPartner } from "@/components/site/featured-partner";
import { PROVINCE_BLOCKS } from "@/lib/data/home-content";
import { isProvinceOpen } from "@/lib/domain/open-areas";
import { recordImpressions, searchPartners, type SortKey } from "@/lib/data/search";
import { VISITOR_COOKIE, visitorRotation } from "@/lib/domain/ranking";
import { pageNumbers, parsePage } from "@/lib/domain/pagination";
import { findService } from "@/lib/domain/service-alias";
import { cn } from "@/lib/utils";
import { aLuogo } from "@/lib/domain/format";

/**
 * Schede per pagina nei risultati: 7 dalla seconda pagina in poi; la prima è più corta (5 + il riquadro grande in evidenza) così l'elenco supera
 * di poco i filtri a sinistra senza lasciare spazio vuoto ai lati (richiesta del cliente, 9/11/2026).
 */
const FIRST_PAGE_SIZE = 5;
const PAGE_SIZE = 7;
/** Servizi che restano nei listini ma non tra i filtri (cliente, 23/11/2026: "Tour virtuale e video" delle agenzie). */
const HIDDEN_FILTER_SERVICES = ["tour-virtuale"];

export type ResultsParams = {
  categoria?: string;
  dove?: string;
  servizio?: string;
  ordina?: string;
  pagina?: string;
  /** Testo scritto nella ricerca libera della Home (/cerca), solo da mostrare. */
  cerca?: string;
};

const SORTS: { value: SortKey; label: string; pro?: true }[] = [
  { value: "rilevanza", label: "Consigliati" },
  { value: "distanza", label: "Distanza" },
  // Le agenzie lavorano a percentuale: ordinarle per prezzo non ha senso.
  { value: "prezzo", label: "Prezzo indicativo", pro: true },
];

const sortsFor = (mode: "agency" | "pro") => SORTS.filter((s) => mode === "pro" || !s.pro);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseResultsParams(sp: Record<string, string | string[] | undefined>): ResultsParams {
  return {
    categoria: first(sp.categoria),
    dove: first(sp.dove),
    servizio: first(sp.servizio),
    ordina: first(sp.ordina),
    pagina: first(sp.pagina),
    cerca: first(sp.cerca)?.trim().slice(0, 80) || undefined,
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
  const [allCategories, zone, provinceZones] = await Promise.all([getCategories(), findZone(params.dove), getProvinceZones()]);
  const { place } = zone;
  // Senza zona si cerca nella prima provincia attiva (Treviso, src/lib/domain/open-areas.ts), non in tutto il Veneto.
  const defaultZone = !place && !zone.province;
  const province = defaultZone ? provinceZones.find((p) => isProvinceOpen(p.code)) ?? null : zone.province;
  // Comune o provincia non ancora attivi: niente risultati, al loro posto il modulo "Inoltra una richiesta".
  const closedCode = place ? (isProvinceOpen(place.provinceCode) ? null : place.provinceCode) : province && !isProvinceOpen(province.code) ? province.code : null;
  const category =
    mode === "agency" ? allCategories.find((c) => c.partnerType === "agency") ?? null : params.categoria ? await getCategoryBySlug(params.categoria) : null;
  const categoryServices = category ? await getServicesForCategory(category.id) : [];
  const service = findService(categoryServices, params.servizio);
  const sort = (sortsFor(mode).find((s) => s.value === params.ordina)?.value ?? "rilevanza") as SortKey;

  const found = closedCode
    ? { featured: null, results: [], total: 0, page: 1, pages: 1 }
    : await searchPartners({
    partnerType: mode,
    categoryId: category?.id,
    serviceId: service?.id,
    place,
    provinceId: province?.id,
    // Senza un comune non c'è un punto da cui misurare: si resta sull'ordine normale e la pagina lo dice.
    sort: sort === "distanza" && !place ? "rilevanza" : sort,
    page: parsePage(params.pagina),
    pageSize: PAGE_SIZE,
    firstPageSize: FIRST_PAGE_SIZE,
    visitorSeed: seed,
  });
  // Zero risultati in un comune: proponiamo la stessa ricerca in tutta la provincia, così la pagina non resta vuota.
  const nearby =
    found.total === 0 && place && !closedCode
      ? await searchPartners({ partnerType: mode, categoryId: category?.id, provinceId: place.provinceId, page: 1, pageSize: 3, firstPageSize: 3, visitorSeed: seed })
      : null;
  return { allCategories, place, province, defaultZone, closedCode, category, categoryServices, service, sort, found, nearby };
}

async function ResultsBody({ mode, params, seed }: { mode: "agency" | "pro"; params: ResultsParams; seed: string }) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", "boosts");
  const basePath = mode === "agency" ? "/trova-casa" : "/trova-professionista";
  const { allCategories, place, province, defaultZone, closedCode, category, categoryServices, service, sort, found, nearby } = await findResults(mode, params, seed);
  const { featured, results, total, page, pages } = found;
  const [places, allZones] = await Promise.all([getMunicipalities(), getProvinceZones()]);
  // Nel filtro Zona prima le province attive.
  const provinceZones = [...allZones].sort((a, b) => Number(isProvinceOpen(b.code)) - Number(isProvinceOpen(a.code)));
  const closed = closedCode ? PROVINCE_BLOCKS.find((b) => b.code === closedCode) ?? null : null;

  const href = (patch: Partial<ResultsParams>) => {
    // Ogni cambio di filtro riparte dalla prima pagina; solo la paginazione passa `pagina`.
    const next = { ...params, pagina: undefined, ...patch };
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };


  const what = mode === "agency" ? "Agenzie immobiliari" : category?.pluralName ?? "Professionisti e artigiani";
  const where = place ? aLuogo(place.name) : province ? `in provincia di ${province.name}` : "in Veneto";
  const proCategories = allCategories.filter((c) => c.partnerType !== "agency");
  // Comune scritto ma non riconosciuto (fuori dal Veneto o con un errore): lo diciamo invece di ignorarlo in silenzio.
  const unknownPlace = params.dove?.trim() && !place && !province ? params.dove.trim() : null;
  // Ricerca libera senza nessuna categoria né servizio riconosciuti.
  const notUnderstood = params.cerca && !service && !(mode === "pro" && category) ? params.cerca : null;
  const filterServices = categoryServices.filter((s) => !HIDDEN_FILTER_SERVICES.includes(s.slug));
  const nearbyList = nearby ? [...(nearby.featured ? [nearby.featured] : []), ...nearby.results].slice(0, 3) : [];

  return (
    <div className="container-page flex flex-col gap-6 py-8 min-[125rem]:max-w-[100rem]">
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
          {closed ? "Zona non ancora attiva" : <>{total} {total === 1 ? "risultato" : "risultati"}</>}
          {total > 0 && mode === "pro" && " · prezzi indicativi nel profilo di ogni partner"}
          {total > 0 && mode === "agency" && " · specializzazioni e portfolio immobili"}
          {params.cerca && !notUnderstood && <> · hai cercato «{params.cerca}»</>}
        </p>
        {(unknownPlace || notUnderstood) && (
          <div role="status" className="mt-2 flex flex-col gap-1 rounded-md border border-line bg-subtle p-3 text-body-s text-ink">
            {notUnderstood && (
              <p>
                Non abbiamo capito «{notUnderstood}». Scegli {mode === "agency" ? "cosa ti serve" : "il tipo di professionista"} nei filtri, oppure
                riprova con parole semplici come «idraulico» o «vendere casa».
              </p>
            )}
            {unknownPlace && (
              <p>
                Non troviamo «{unknownPlace}» tra i comuni del Veneto: ti mostriamo {defaultZone ? `la provincia di ${province?.name ?? "Treviso"}` : "la zona scelta"}. Controlla come è
                scritto o scegli un comune dall&apos;elenco del campo Zona.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Colonna sinistra: filtri. Sul telefono sopra le aziende (cliente, 20/11/2026). */}
        <div className="flex flex-col gap-4 self-start">
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
              <Input
                id="dove"
                name="dove"
                list="comuni-filtro"
                // Freccia nera di Chrome per il datalist: stonava accanto alla select, i suggerimenti compaiono scrivendo.
                className="[&::-webkit-calendar-picker-indicator]:hidden"
                defaultValue={place?.name ?? province?.label ?? params.dove ?? ""} placeholder="Comune o provincia" />
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
                {sortsFor(mode).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
              {sort === "distanza" && !place && (
                <p className="text-caption text-ink-2">Per ordinare per distanza scrivi un comune nel campo Zona.</p>
              )}
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

            {filterServices.length > 0 && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-body-s font-semibold">{mode === "agency" ? "Cosa ti serve" : "Lavoro specifico"}</legend>
                <div className="flex flex-wrap gap-2">
                  {filterServices.map((s) => (
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
                Come ordiniamo: mostriamo solo chi lavora nella zona cercata, poi prima le aziende con l&apos;abbonamento a pagamento più alto (Premium,
                fascia lavanda; Normal, fascia verde; poi gli altri). Chi ha comprato più visibilità sale nel suo gruppo e porta l&apos;etichetta
                &quot;Sponsorizzato&quot;, come il riquadro grande in cima, che è uno spazio a pagamento delle aziende Premium. Tra aziende dello stesso piano
                l&apos;ordine cambia a ogni visita.{" "}
                <Link href="/come-ordiniamo-i-risultati" className="font-semibold text-primary underline">
                  Dettagli
                </Link>
              </span>
            </p>
          </aside>
        </div>

        <section aria-label="Risultati" className="flex flex-col gap-4">
          <h2 className="sr-only">Risultati</h2>
          {closed && (
            <div className="rounded-lg border border-line bg-surface">
              <AreaRequestForm
                province={closed}
                titleId="richiesta-zona-titolo"
                categories={allCategories.map(({ id, name, partnerType }) => ({ id, name, partnerType }))}
                places={places.filter((p) => p.provinceCode === closed.code).map(({ id, name, provinceCode }) => ({ id, name, provinceCode }))}
                defaultCategory={category?.id}
                defaultPlace={place?.name}
              />
            </div>
          )}
          {featured && <FeaturedPartner p={featured} />}
          {results.map((p) => (
            <PartnerCard key={p.id} p={p} />
          ))}
          {pages > 1 && <Pagination page={page} pages={pages} href={(n) => href({ pagina: n > 1 ? String(n) : undefined })} />}
          {total === 0 && !closed && (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface p-10 text-center">
              <h3 className="text-h3 font-semibold">Nessun risultato con questi filtri</h3>
              <p className="max-w-md text-body-s text-ink-2">
                Prova ad allargare la zona o a togliere un filtro. Stiamo attivando nuovi partner in provincia di Treviso.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {!defaultZone && (
                  <Link href={href({ dove: undefined })} className="font-semibold text-primary underline">
                    Cerca in tutta la provincia di Treviso
                  </Link>
                )}
                <Link href={basePath} className="font-semibold text-primary underline">
                  Azzera i filtri
                </Link>
              </div>
            </div>
          )}
          {nearbyList.length > 0 && place && (
            <div className="flex flex-col gap-4">
              <h3 className="text-h4 font-semibold">Vicino {aLuogo(place.name)}, in provincia di {place.provinceName}</h3>
              {nearbyList.map((p) => (
                <PartnerCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="container-page flex flex-col gap-6 py-8 min-[125rem]:max-w-[100rem]" aria-busy="true" aria-label="Caricamento dei risultati">
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
