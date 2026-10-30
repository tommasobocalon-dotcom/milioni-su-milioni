import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { Geco } from "@/components/site/geco";
import { LocateButton } from "@/components/site/locate-button";
import { NearbyList } from "@/components/site/nearby-list";
import { Radar } from "@/components/site/radar";
import { Button } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { findPlace, getCategories, getMunicipalities } from "@/lib/data/catalog";
import { getPartnersNear } from "@/lib/data/nearby";
import { nearestPlace, parseCoords, parseRadius, RADII_KM } from "@/lib/domain/nearby";

export const metadata: Metadata = {
  title: "Vicino a te",
  description: "Agenzie, tecnici e artigiani verificati vicino a te, dal più vicino: usa la tua posizione o scegli il comune.",
};

/** Senza posizione né comune si mostra un esempio, detto come tale. */
const EXAMPLE_PLACE = "padova";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function VicinoATePage({ searchParams }: PageProps<"/vicino-a-te">) {
  return (
    <div className="container-page flex flex-col gap-10 py-10 md:py-16">
      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="font-display text-h1 md:text-display-l">Chi lavora vicino a te</h1>
        <p className="text-body-l text-ink">
          Le aziende verificate dalla più vicina, entro il raggio che scegli. La posizione la chiediamo solo se premi il pulsante:
          resta arrotondata a un chilometro e non la salviamo.
        </p>
      </header>
      <Suspense fallback={<div className="h-[36rem] animate-pulse rounded-xl bg-muted" aria-busy="true" />}>
        {searchParams.then((sp) => (
          <Nearby lat={first(sp.lat)} lng={first(sp.lng)} where={first(sp.dove)} radius={first(sp.raggio)} category={first(sp.categoria)} />
        ))}
      </Suspense>
    </div>
  );
}

async function Nearby(props: { lat?: string; lng?: string; where?: string; radius?: string; category?: string }) {
  const radiusKm = parseRadius(props.radius);
  const coords = parseCoords(props.lat, props.lng);
  const [places, categories] = await Promise.all([getMunicipalities(), getCategories()]);
  const category = categories.find((c) => c.slug === props.category && c.partnerCount > 0);

  const typedPlace = coords ? null : await findPlace(props.where);
  const place = typedPlace ?? (coords ? null : await findPlace(EXAMPLE_PLACE));
  const center = coords ?? place;
  const near = coords ? nearestPlace(coords, places) : null;
  const centerLabel = coords ? "Tu" : (place?.name ?? "");
  const isExample = !coords && !typedPlace;
  const partners = center ? await getPartnersNear(center, radiusKm, category?.slug) : [];

  const href = (patch: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const base = coords
      ? { lat: coords.lat, lng: coords.lng, raggio: radiusKm, categoria: category?.slug }
      : { dove: typedPlace?.name, raggio: radiusKm, categoria: category?.slug };
    for (const [k, v] of Object.entries({ ...base, ...patch })) if (v !== undefined && v !== "") q.set(k, String(v));
    return `/vicino-a-te?${q}`;
  };

  const where = coords ? `dalla tua posizione${near ? ` (vicino a ${near.name})` : ""}` : `da ${place?.name}`;

  return (
    <>
      <div className="flex flex-col gap-6 rounded-xl bg-surface p-5 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <LocateButton radiusKm={radiusKm} category={category?.slug} className="shrink-0" />
          <span className="text-body-s text-ink-2 lg:pt-3">oppure</span>
          <form action="/vicino-a-te" method="get" role="search" className="flex flex-1 flex-col gap-2 sm:flex-row">
            <label htmlFor="dove" className="sr-only">
              Comune
            </label>
            <Input id="dove" name="dove" list="comuni-vicino" defaultValue={typedPlace?.name ?? ""} placeholder="Scrivi il tuo comune, es. Mestre" className="sm:max-w-sm" />
            <datalist id="comuni-vicino">
              {places.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
            <input type="hidden" name="raggio" value={radiusKm} />
            {category && <input type="hidden" name="categoria" value={category.slug} />}
            <Button type="submit" variant="secondary">
              <Search aria-hidden /> Cerca
            </Button>
          </form>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-10">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-body-s font-semibold">Raggio</legend>
            <div className="flex flex-wrap gap-2">
              {RADII_KM.map((r) => (
                <ChipLink key={r} href={href({ raggio: r })} selected={r === radiusKm} scroll={false}>
                  {r} km
                </ChipLink>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-body-s font-semibold">Chi cerchi</legend>
            <div className="flex flex-wrap gap-2">
              <ChipLink href={href({ categoria: undefined })} selected={!category} scroll={false}>
                Tutti
              </ChipLink>
              {categories
                .filter((c) => c.partnerCount > 0)
                .map((c) => (
                  <ChipLink key={c.id} href={href({ categoria: c.slug })} selected={category?.id === c.id} scroll={false}>
                    {c.pluralName}
                  </ChipLink>
                ))}
            </div>
          </fieldset>
        </div>
      </div>

      {!center ? (
        <Empty text="Non troviamo questo comune. Siamo attivi in Veneto: prova con il nome del comune, per esempio Padova o Mestre." />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <figure className="flex flex-col gap-2 rounded-xl bg-surface p-4 sm:p-6 lg:sticky lg:top-24">
            {/* key: con un nuovo centro o raggio il radar riparte da capo, scia compresa. */}
            <Radar key={`${centerLabel}-${radiusKm}-${category?.slug ?? ""}`} partners={partners} radiusKm={radiusKm} centerLabel={centerLabel} />
            <figcaption className="text-center text-caption text-ink-2">
              {isExample ? "Esempio: il" : "Il"} punto giallo è {coords ? "la tua posizione" : place?.name}. Nord in alto, i numeri sono
              quelli dell&apos;elenco.
            </figcaption>
          </figure>
          <section aria-labelledby="elenco" className="flex flex-col gap-4">
            <h2 id="elenco" className="font-display text-h2">
              {partners.length} {partners.length === 1 ? "azienda" : "aziende"} entro {radiusKm} km {where}
            </h2>
            {partners.length > 0 ? (
              <NearbyList partners={partners} />
            ) : (
              <Empty
                text={
                  radiusKm < 50
                    ? "Nessuna azienda in questo raggio. Prova ad allargarlo o a togliere il filtro."
                    : "Nessuna azienda entro 50 km. Per ora siamo attivi in Veneto: stiamo attivando nuovi partner."
                }
              />
            )}
          </section>
        </div>
      )}
    </>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-surface p-10 text-center">
      <Geco outfit="pensa" size={120} />
      <p className="max-w-md text-body text-ink">{text}</p>
    </div>
  );
}
