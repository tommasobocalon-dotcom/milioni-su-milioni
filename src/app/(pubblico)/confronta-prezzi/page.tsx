import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Info } from "lucide-react";
import { Geco } from "@/components/site/geco";
import { PriceFigures, PriceRangeChart, ValueBars } from "@/components/site/price-chart";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { defaultService, getHousePrices, getPricedServices, getServicePrices, type PricedService } from "@/lib/data/prices";
import { formatEuro, formatPriceRange } from "@/lib/domain/format";
import { priceSummary } from "@/lib/domain/price-compare";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Confronta prezzi",
  description:
    "Prezzi indicativi dei lavori di casa pubblicati da tecnici e artigiani del Veneto, e prezzo al metro quadro delle case in vendita e in affitto.",
};

const TABS = [
  { value: "lavori", label: "Lavori di casa" },
  { value: "vendita", label: "Case in vendita" },
  { value: "affitto", label: "Case in affitto" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function ConfrontaPrezziPage({ searchParams }: PageProps<"/confronta-prezzi">) {
  return (
    <div className="container-page flex flex-col gap-10 py-10 md:py-16">
      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="font-display text-h1 md:text-display-l">Confronta i prezzi</h1>
        <p className="text-body-l text-ink">
          I prezzi indicativi pubblicati dalle aziende del Veneto e il prezzo al metro quadro delle case, messi in fila. Prima di
          chiamare sai già quanto aspettarti.
        </p>
      </header>
      <Suspense fallback={<div className="h-[36rem] animate-pulse rounded-xl bg-muted" aria-busy="true" />}>
        {searchParams.then((sp) => {
          const tab = (TABS.find((t) => t.value === first(sp.tipo))?.value ?? "lavori") as Tab;
          return (
            <>
              <nav aria-label="Cosa confrontare" className="grid max-w-xl grid-cols-3 gap-1 rounded-md bg-muted p-1">
                {TABS.map((t) => (
                  <Link
                    key={t.value}
                    href={t.value === "lavori" ? "/confronta-prezzi" : `/confronta-prezzi?tipo=${t.value}`}
                    aria-current={tab === t.value ? "page" : undefined}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-sm px-2 text-center text-body-s font-semibold transition-colors",
                      tab === t.value ? "bg-surface text-ink" : "text-ink-2 hover:text-ink",
                    )}
                  >
                    {t.label}
                  </Link>
                ))}
              </nav>
              {tab === "lavori" ? <WorkPrices choice={first(sp.voce)} /> : <HousePrices contract={tab === "vendita" ? "sale" : "rent"} />}
            </>
          );
        })}
      </Suspense>
    </div>
  );
}

function serviceKey(s: Pick<PricedService, "categorySlug" | "slug">) {
  return `${s.categorySlug}/${s.slug}`;
}

async function WorkPrices({ choice }: { choice?: string }) {
  const services = await getPricedServices();
  const service = services.find((s) => serviceKey(s) === choice) ?? defaultService(services);
  const data = service ? await getServicePrices(service.categorySlug, service.slug) : null;
  const summary = data ? priceSummary(data.prices) : null;
  const byCategory = Map.groupBy(services, (s) => s.categoryName);

  return (
    <div className="flex flex-col gap-10">
      <form action="/confronta-prezzi" method="get" className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-body-s font-semibold">Che lavoro devi fare?</span>
          <Select name="voce" defaultValue={service ? serviceKey(service) : undefined}>
            {[...byCategory].map(([category, list]) => (
              <optgroup key={category} label={category}>
                {list.map((s) => (
                  <option key={serviceKey(s)} value={serviceKey(s)}>
                    {s.name} ({s.partnerCount})
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">
          Confronta
        </Button>
      </form>

      {!data || !summary || !service ? (
        <Empty text="Per questo lavoro non ci sono ancora prezzi pubblicati. Prova con un altro, o chiedi un preventivo." />
      ) : (
        <>
          <section aria-labelledby="riassunto" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="riassunto" className="font-display text-h2">
                {data.serviceName}
              </h2>
              <p className="text-body text-ink-2">Quanto costa in Veneto, secondo i listini pubblicati dalle aziende.</p>
            </div>
            <PriceFigures
              items={[
                { label: "Si parte da", value: formatPriceRange(summary.min, summary.min, data.unit) ?? "–" },
                {
                  label: "Prezzo tipico",
                  value: formatPriceRange(summary.median, summary.median, data.unit) ?? "–",
                  note: "La metà delle aziende parte da qui o meno",
                },
                {
                  label: "Fino a",
                  value: formatPriceRange(summary.max, summary.max, data.unit) ?? "–",
                  note: `${summary.count} ${summary.count === 1 ? "azienda" : "aziende"} con un prezzo pubblicato`,
                },
              ]}
            />
          </section>

          <section aria-labelledby="per-azienda" className="flex flex-col gap-3 rounded-xl bg-surface p-3 sm:p-6">
            <h2 id="per-azienda" className="px-3 text-h3 font-semibold">
              Prezzo per azienda, dalla più economica
            </h2>
            <PriceRangeChart prices={data.prices} summary={summary} unit={data.unit} />
          </section>

          {data.provinces.length > 1 && (
            <section aria-labelledby="per-provincia" className="flex flex-col gap-5">
              <h2 id="per-provincia" className="font-display text-h2">
                Prezzo tipico per provincia
              </h2>
              <ValueBars
                label="Prezzo tipico per provincia"
                rows={data.provinces.map((p) => ({
                  key: p.code,
                  name: p.name,
                  value: p.median,
                  valueLabel: formatPriceRange(p.median, p.median, data.unit) ?? "–",
                  note: `${p.count} ${p.count === 1 ? "azienda" : "aziende"}`,
                }))}
              />
            </section>
          )}

          <Note>
            Prezzi indicativi pubblicati dalle aziende nel loro listino: il preventivo finale dipende dal sopralluogo e dal
            lavoro vero. Il prezzo tipico è la mediana dei prezzi di partenza.
          </Note>
          <ButtonLink href={`/trova-professionista?categoria=${service.categorySlug}&servizio=${service.slug}`} className="self-start">
            Trova chi lo fa nella tua zona <ArrowRight aria-hidden />
          </ButtonLink>
        </>
      )}
    </div>
  );
}

async function HousePrices({ contract }: { contract: "sale" | "rent" }) {
  const { areas, overall } = await getHousePrices(contract);
  const rent = contract === "rent";
  const unit = rent ? "/m² al mese" : "/m²";
  if (!overall || areas.length === 0) {
    return <Empty text="Le agenzie non hanno ancora pubblicato abbastanza immobili per calcolare un prezzo al metro quadro." />;
  }
  const top = areas[0];
  const bottom = areas.at(-1)!;
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="riassunto" className="flex flex-col gap-4">
        <h2 id="riassunto" className="font-display text-h2">
          {rent ? "Affitti" : "Case in vendita"}: prezzo al metro quadro
        </h2>
        <PriceFigures
          items={[
            {
              label: "Media sugli immobili pubblicati",
              value: `${formatEuro(overall.average)}${unit}`,
              note: `${overall.count} ${overall.count === 1 ? "immobile" : "immobili"} in ${areas.length} ${areas.length === 1 ? "comune" : "comuni"}`,
            },
            { label: `Comune più caro: ${top.municipalityName}`, value: `${formatEuro(top.summary.average)}${unit}` },
            { label: `Comune meno caro: ${bottom.municipalityName}`, value: `${formatEuro(bottom.summary.average)}${unit}` },
          ]}
        />
      </section>
      <section aria-labelledby="per-comune" className="flex flex-col gap-5 rounded-xl bg-surface p-5 sm:p-8">
        <h2 id="per-comune" className="font-display text-h2">
          Per comune, dal più caro
        </h2>
        <ValueBars
          label={`Prezzo medio al metro quadro per comune, ${rent ? "affitto" : "vendita"}`}
          rows={areas.map((a) => ({
            key: a.municipalitySlug,
            name: `${a.municipalityName} (${a.provinceCode})`,
            value: a.summary.average,
            valueLabel: `${formatEuro(a.summary.average)}${unit}`,
            note:
              a.summary.count === 1
                ? "1 immobile"
                : `da ${formatEuro(a.summary.min)} a ${formatEuro(a.summary.max)} · ${a.summary.count} immobili`,
          }))}
        />
      </section>
      <Note>
        Calcolato sugli immobili pubblicati nel portfolio delle agenzie partner di geco, non è una quotazione ufficiale. Per sapere
        quanto vale la tua casa chiedi una valutazione a un&apos;agenzia della zona.
      </Note>
      <ButtonLink href={`/trova-casa?servizio=${rent ? "affitti" : "valutazione"}`} className="self-start">
        {rent ? "Trova un'agenzia per l'affitto" : "Chiedi una valutazione"} <ArrowRight aria-hidden />
      </ButtonLink>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex max-w-3xl gap-2 rounded-md bg-subtle p-4 text-body-s text-ink">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
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
