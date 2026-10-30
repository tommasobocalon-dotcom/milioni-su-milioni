import Image from "next/image";
import Link from "next/link";
import { cache, Suspense } from "react";
import { ArrowRight, Check, Star } from "lucide-react";
import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { Geco } from "@/components/site/geco";
import { LocateButton } from "@/components/site/locate-button";
import { NearbyList } from "@/components/site/nearby-list";
import { PartnerCard } from "@/components/site/partner-card";
import { PriceRangeChart } from "@/components/site/price-chart";
import { Radar } from "@/components/site/radar";
import { SearchBar } from "@/components/site/search-bar";
import { SearchDemo } from "@/components/site/search-demo";
import { ButtonLink } from "@/components/ui/button";
import { LogoPartner } from "@/components/ui/logo-partner";
import { findPlace, getCategories, getCategoryBySlug } from "@/lib/data/catalog";
import { CATEGORY_PHOTOS } from "@/lib/data/category-photos";
import { getPartnersNear } from "@/lib/data/nearby";
import { defaultService, getPricedServices, getServicePrices } from "@/lib/data/prices";
import { searchPartners } from "@/lib/data/search";
import { db } from "@/lib/db/client";
import { formatDistanceKm, formatPriceRange, formatRating } from "@/lib/domain/format";
import { interpretQuery } from "@/lib/domain/intent";
import { priceSummary } from "@/lib/domain/price-compare";

const POPULAR = ["Certificato APE", "Rifare il bagno", "Valutazione casa", "Pratiche catastali", "Cappotto termico"];

/**
 * Immagine della hero. Segnaposto: la foto di Treviso già usata per le agenzie, finché non arriva lo screenshot
 * scelto dal cliente (da mettere in public/foto/ e da indicare qui, con il suo testo alternativo e il credito).
 */
const HERO = CATEGORY_PHOTOS["agenzia-immobiliare"];

/** Centro degli esempi in Home (radar e anteprima dei risultati): nessuna posizione della persona. */
const SAMPLE_PLACE = "padova";
const SAMPLE_RADIUS_KM = 10;

/** Frasi come le scrive la gente: il primo blocco mostra dove le porta la ricerca (regole vere di intent.ts). */
const PHRASES = ["mi perde il lavandino", "APE per vendere casa", "affittare il bilocale", "cappotto termico"];

export default function HomePage() {
  return (
    <>
      <section aria-labelledby="titolo-home" className="container-page pt-4 pb-20 md:pt-6 md:pb-28">
        <figure className="relative h-[clamp(15rem,52vh,34rem)] overflow-hidden rounded-xl bg-subtle">
          <Image src={HERO.src} alt={HERO.alt} fill priority sizes="(min-width: 1280px) 1216px, 100vw" className="hero-foto object-cover" />
          <figcaption className="absolute top-3 right-3 max-w-[80%] rounded-sm bg-neutro-900/70 px-2 py-1 text-caption text-white">
            {HERO.credit.title}, foto di{" "}
            <a href={HERO.credit.page} className="underline" rel="noopener" target="_blank">
              {HERO.credit.author}
            </a>{" "}
            ·{" "}
            <a href={HERO.credit.licenseUrl} className="underline" rel="noopener license" target="_blank">
              {HERO.credit.license}
            </a>
          </figcaption>
        </figure>

        <div id="cerca" className="relative mx-auto -mt-14 flex max-w-5xl scroll-mt-24 flex-col gap-5 rounded-xl bg-surface p-5 shadow-float sm:-mt-24 sm:p-8 md:p-10">
          <Geco outfit="saluto" size={124} priority className="absolute -top-[6.5rem] right-6 hidden md:block" />
          <h1 id="titolo-home" className="max-w-3xl font-display text-h1 text-balance md:text-display-l">
            Trova chi lavora alla tua casa.
          </h1>
          <p className="max-w-3xl text-body-l text-ink">
            Agenzie immobiliari, tecnici e artigiani verificati vicino a te, in Veneto. Scrivi cosa ti serve e dove: ti mostriamo
            tutte le aziende disponibili, con prezzi indicativi e recensioni vere.
          </p>
          <SearchBar className="shadow-none" />
          <p className="flex flex-wrap items-center gap-2 text-body-s text-ink-2">
            <span>Più cercati:</span>
            {POPULAR.map((q) => (
              <Link
                key={q}
                href={`/cerca?q=${encodeURIComponent(q)}`}
                className="rounded-full bg-subtle px-3 py-1 font-medium text-brand transition-colors hover:bg-brand-soft"
              >
                {q}
              </Link>
            ))}
          </p>
        </div>
      </section>

      <section aria-labelledby="come-cerchi" className="container-page pb-24 md:pb-32">
        <div className="mb-10 flex max-w-3xl flex-col gap-3">
          <h2 id="come-cerchi" className="entra font-display text-h1 md:text-display-l">
            Dalla ricerca all&apos;elenco
          </h2>
          <p className="entra text-body-l text-ink" style={{ "--ritardo": 1 } as React.CSSProperties}>
            Due passi e non devi sapere chi chiamare. Ci dici cosa ti serve, noi troviamo le aziende verificate che lavorano nella
            tua zona.
          </p>
        </div>
        <ol className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <li className="entra flex flex-col gap-8 rounded-xl bg-brand-soft p-6 sm:p-8 md:p-10">
            <div className="flex flex-col gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand font-semibold text-on-brand" aria-hidden>
                1
              </span>
              <h3 className="font-display text-h2">Scrivi cosa ti serve e dove</h3>
              <p className="text-body text-neutro-700">
                Un lavoro, un servizio o &laquo;vendere casa&raquo;, più il comune. Capiamo noi se ti serve un&apos;agenzia, un
                tecnico o un artigiano.
              </p>
            </div>
            <SearchDemo />
            <Suspense fallback={null}>
              <PhraseExamples />
            </Suspense>
            <Link href="#cerca" className="mt-auto inline-flex items-center gap-1 self-start font-semibold text-primary hover:underline">
              Prova adesso <ArrowRight className="size-4" aria-hidden />
            </Link>
          </li>
          <li className="entra flex flex-col gap-8 rounded-xl bg-brand p-6 text-on-brand sm:p-8 md:p-10" style={{ "--ritardo": 1 } as React.CSSProperties}>
            <div className="flex flex-col gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-surface font-semibold text-brand" aria-hidden>
                2
              </span>
              <h3 className="font-display text-h2">Accedi e vedi tutte le aziende</h3>
              <p className="text-body text-on-brand-muted">
                Entri con email, Google o Apple, oppure crei l&apos;account in un minuto. Subito dopo ti portiamo all&apos;elenco
                completo della zona: aziende verificate, prezzi indicativi e recensioni di clienti veri.
              </p>
            </div>
            <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-bosco-800" />}>
              <ResultsPreview />
            </Suspense>
            <ButtonLink href="/accedi" variant="light" className="mt-auto self-start">
              Accedi o crea un account <ArrowRight aria-hidden />
            </ButtonLink>
          </li>
        </ol>
      </section>

      <section aria-label="Le due sezioni" className="container-page grid grid-cols-1 gap-6 pb-24 md:grid-cols-2 md:pb-32">
        <EntryCard
          tone="light"
          title="Trova Casa"
          text="Confronta le agenzie immobiliari della tua zona: valutazioni, specializzazioni e portfolio a colpo d'occhio."
          points={["Comprare, vendere o affittare", "Valutazione dell'immobile", "Confronto fino a 3 agenzie"]}
          href="/trova-casa"
          cta="Confronta le agenzie"
          outfit="casa"
        />
        <EntryCard
          tone="dark"
          title="Trova Professionista"
          text="Geometri, tecnici e artigiani filtrabili per zona e tipo di lavoro, con prezzi indicativi e recensioni verificate."
          points={["Prezzi indicativi pubblicati", "Recensioni solo da clienti reali", "Risposta media in giornata"]}
          href="/trova-professionista"
          cta="Cerca un professionista"
          outfit="professionista"
        />
      </section>

      <section aria-labelledby="prezzi" className="bg-surface py-24 md:py-32">
        <Suspense fallback={<div className="container-page h-[28rem] animate-pulse rounded-xl bg-muted" />}>
          <PricesTeaser />
        </Suspense>
      </section>

      <section aria-labelledby="vicino" className="container-page py-24 md:py-32">
        <Suspense fallback={<div className="h-[28rem] animate-pulse rounded-xl bg-muted" />}>
          <NearbyTeaser />
        </Suspense>
      </section>

      <section className="bg-surface py-24 md:py-28" aria-labelledby="come-funziona">
        <div className="container-page">
          <h2 id="come-funziona" className="entra mb-8 font-display text-h2">
            E dopo? Come funziona il contatto
          </h2>
          <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              ["Scegli e confronta", "Stelle, prezzi indicativi e tempi di risposta, fianco a fianco. Puoi confrontare fino a tre aziende."],
              ["Richiedi un contatto", "Un modulo guidato ti aiuta a spiegare il lavoro. Verifichiamo il numero con un SMS."],
              ["Vieni ricontattato", "L'azienda ti richiama nella fascia oraria che preferisci. Poi lasci una recensione verificata."],
            ].map(([title, text], i) => (
              <li key={title} className="entra flex flex-col gap-3 rounded-lg bg-page p-6" style={{ "--ritardo": i } as React.CSSProperties}>
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary font-semibold text-on-brand" aria-hidden>
                  {i + 1}
                </span>
                <h3 className="text-h4 font-semibold">{title}</h3>
                <p className="text-body-s text-ink-2">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-24 md:py-28" aria-labelledby="in-evidenza">
        <h2 id="in-evidenza" className="font-display text-h2">
          Idraulici in evidenza a Padova
        </h2>
        <p className="mb-6 text-body-s text-ink-2">
          Ordinati per pertinenza, valutazione e tempo di risposta. I contenuti a pagamento sono sempre etichettati.
        </p>
        <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-muted" />}>
          <Featured />
        </Suspense>
      </section>

      <section className="container-page pb-24">
        <div className="flex flex-col items-start gap-6 rounded-xl bg-brand p-8 text-on-brand md:p-10 lg:flex-row lg:items-center">
          <Geco outfit="partner" size={120} />
          <div className="flex flex-1 flex-col gap-2">
            <p className="caps-label text-on-brand-muted">Per agenzie, studi tecnici e artigiani</p>
            <h2 className="font-display text-h2">Richieste qualificate dalla tua zona</h2>
            <p className="text-body-s text-on-brand-muted">
              Abbonamento fisso mensile o annuale, lead verificati con OTP, scheda gestita in autonomia. Token prepagati per
              visibilità extra.
            </p>
          </div>
          <ButtonLink href="/per-i-professionisti" variant="light">
            Scopri i piani <ArrowRight aria-hidden />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}

function EntryCard(props: {
  tone: "light" | "dark";
  title: string;
  text: string;
  points: string[];
  href: string;
  cta: string;
  outfit: "casa" | "professionista";
}) {
  const dark = props.tone === "dark";
  return (
    <div className={`entra flex items-center gap-4 rounded-xl p-8 ${dark ? "bg-brand text-on-brand" : "bg-brand-soft text-ink"}`}>
      <div className="flex flex-1 flex-col gap-4">
        <h2 className="font-display text-h2">{props.title}</h2>
        <p className={`text-body-s ${dark ? "text-on-brand-muted" : "text-neutro-700"}`}>{props.text}</p>
        <ul className="flex flex-col gap-1.5 text-body-s">
          {props.points.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <Check className="size-4 shrink-0" aria-hidden /> {p}
            </li>
          ))}
        </ul>
        <ButtonLink href={props.href} variant={dark ? "light" : "primary"} className="self-start">
          {props.cta} <ArrowRight aria-hidden />
        </ButtonLink>
      </div>
      <Geco outfit={props.outfit} size={150} className="hidden sm:block md:hidden lg:block" />
    </div>
  );
}

/** Primo blocco: frasi libere e la sezione in cui portano. */
async function PhraseExamples() {
  const categories = await getCategories();
  const rows = PHRASES.map((phrase) => {
    const intent = interpretQuery(phrase);
    const category = intent.mode === "agency" ? categories.find((c) => c.partnerType === "agency") : categories.find((c) => c.slug === intent.category);
    return { phrase, target: category?.pluralName ?? "Professionisti" };
  });
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body-s font-semibold text-neutro-700">Scrivi come parli, per esempio:</p>
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li
            key={r.phrase}
            className="entra flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface px-4 py-3"
            style={{ "--ritardo": i } as React.CSSProperties}
          >
            <span className="text-body">&laquo;{r.phrase}&raquo;</span>
            <ArrowRight className="size-4 text-ink-2" aria-label="porta a" />
            <span className="font-semibold text-primary">{r.target}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Una sola lettura per l'anteprima dei risultati e per il radar. */
const samplePartners = cache(async () => {
  const place = await findPlace(SAMPLE_PLACE);
  if (!place) return { place: null, partners: [] };
  return { place, partners: await getPartnersNear(place, SAMPLE_RADIUS_KM) };
});

/** Secondo blocco: com'è l'elenco dopo l'accesso, con le aziende vere più vicine al centro di Padova. */
async function ResultsPreview() {
  const { place, partners } = await samplePartners();
  if (!place || partners.length === 0) return null;
  const top = partners.slice(0, 3);
  return (
    <div data-ui className="flex flex-col gap-2 rounded-lg bg-surface p-3 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1">
        <p className="text-body-s font-semibold">Aziende vicino a {place.name}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2.5 py-1 text-caption font-semibold text-primary">
          <Check className="size-3.5" aria-hidden /> Accesso effettuato
        </span>
      </div>
      {top.map((p, i) => (
        <div key={p.id} className="entra flex items-center gap-3 rounded-md bg-page px-3 py-2.5" style={{ "--ritardo": i + 1 } as React.CSSProperties}>
          <LogoPartner name={p.displayName} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{p.displayName}</p>
            <p className="truncate text-caption text-ink-2">
              {p.categoryName} · {p.municipalityName} · {formatDistanceKm(p.distanceKm)}
            </p>
          </div>
          {p.rating.count > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 text-body-s font-semibold">
              <Star className="size-4 fill-star text-star" aria-hidden /> {formatRating(p.rating.average)}
            </span>
          )}
        </div>
      ))}
      {partners.length > top.length && (
        <p className="px-2 pb-1 text-caption text-ink-2">
          e altre {partners.length - top.length} aziende entro {SAMPLE_RADIUS_KM} km
        </p>
      )}
    </div>
  );
}

async function PricesTeaser() {
  const service = defaultService(await getPricedServices());
  const data = service ? await getServicePrices(service.categorySlug, service.slug) : null;
  const summary = data ? priceSummary(data.prices) : null;
  return (
    <div className="container-page grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-16">
      <div className="flex flex-col gap-5">
        <h2 id="prezzi" className="entra font-display text-h1 md:text-display-l">
          Quanto costa, prima di chiamare
        </h2>
        <p className="entra text-body-l text-ink" style={{ "--ritardo": 1 } as React.CSSProperties}>
          Le aziende pubblicano un listino indicativo. Noi lo mettiamo in fila: per ogni lavoro vedi il prezzo più basso, quello
          tipico e il più alto, con il nome di chi lo fa.
        </p>
        {summary && data && (
          <dl className="entra grid grid-cols-3 gap-3" style={{ "--ritardo": 2 } as React.CSSProperties}>
            {(
              [
                ["Da", summary.min],
                ["Tipico", summary.median],
                ["Fino a", summary.max],
              ] as const
            ).map(([label, cents]) => (
              <div key={label} className="flex flex-col gap-1 rounded-lg bg-page p-4">
                <dt className="text-body-s text-ink-2">{label}</dt>
                <dd className="font-display text-h3 whitespace-nowrap tabular-nums xl:text-h2">{formatPriceRange(cents, cents, data.unit)}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="flex flex-col gap-2">
          <ButtonLink href="/confronta-prezzi" className="self-start">
            Confronta i prezzi <ArrowRight aria-hidden />
          </ButtonLink>
          <p className="text-caption text-ink-2">Prezzi indicativi pubblicati dalle aziende: il preventivo finale dipende dal sopralluogo.</p>
        </div>
      </div>
      {summary && data && service ? (
        <div className="entra rounded-xl bg-page p-3 sm:p-5" style={{ "--ritardo": 1 } as React.CSSProperties}>
          <h3 className="px-3 pt-2 pb-3 text-h4 font-semibold">
            {data.serviceName} · {data.prices.length} {data.prices.length === 1 ? "azienda" : "aziende"} in Veneto
          </h3>
          <PriceRangeChart prices={data.prices.slice(0, 6)} summary={summary} unit={data.unit} />
          {data.prices.length > 6 && (
            <Link
              href={`/confronta-prezzi?voce=${service.categorySlug}/${service.slug}`}
              className="mt-2 inline-flex items-center gap-1 px-3 text-body-s font-semibold text-primary hover:underline"
            >
              Tutte le {data.prices.length} aziende <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}

async function NearbyTeaser() {
  const { place, partners } = await samplePartners();
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
      <div className="flex flex-col gap-5">
        <h2 id="vicino" className="entra font-display text-h1 md:text-display-l">
          Chi lavora vicino a te
        </h2>
        <p className="entra text-body-l text-ink" style={{ "--ritardo": 1 } as React.CSSProperties}>
          Concedi la posizione, o scrivi il tuo comune, e il radar ti mostra le aziende verificate entro 5, 10, 25 o 50 km, dalla
          più vicina. La posizione resta nel browser, arrotondata a un chilometro, e non la salviamo.
        </p>
        {partners.length > 0 && <NearbyList partners={partners.slice(0, 4)} compact />}
        <div className="flex flex-wrap items-start gap-3">
          <LocateButton />
          <ButtonLink href="/vicino-a-te" variant="secondary">
            Scegli un comune
          </ButtonLink>
        </div>
      </div>
      {place && (
        <figure className="entra flex flex-col gap-2 rounded-xl bg-surface p-4 sm:p-6" style={{ "--ritardo": 1 } as React.CSSProperties}>
          <Radar partners={partners} radiusKm={SAMPLE_RADIUS_KM} centerLabel={place.name} />
          <figcaption className="text-center text-caption text-ink-2">
            Esempio intorno a {place.name} (il punto giallo): {partners.length} aziende entro {SAMPLE_RADIUS_KM} km. I numeri sono quelli
            dell&apos;elenco.
          </figcaption>
        </figure>
      )}
    </div>
  );
}

async function Featured() {
  await connection();
  const [place, category] = await Promise.all([findPlace("padova"), getCategoryBySlug("idraulico")]);
  const { sponsored, results } = await searchPartners({ categoryId: category?.id, place });
  const list = [...sponsored, ...results].slice(0, 3);
  const [stats] = await db.execute<{ partners: number; reviews: number; average: number }>(sql`
    select (select count(*)::int from partners where verification_status = 'verified' and account_status = 'active') as partners,
           (select count(*)::int from reviews where status = 'published') as reviews,
           (select coalesce(avg(rating), 0)::float from reviews where status = 'published') as average`);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        {list.map((p) => (
          <PartnerCard key={p.id} p={p} />
        ))}
        <Link href="/trova-professionista?categoria=idraulico&dove=Padova" className="self-start text-body-s font-semibold text-primary hover:underline">
          Vedi tutti gli idraulici a Padova
        </Link>
      </div>
      <aside id="recensioni" className="flex flex-col gap-4 rounded-lg bg-subtle p-6">
        <Geco outfit="recensioni" size={96} />
        <h3 className="text-h4 font-semibold">Recensioni verificate</h3>
        <p className="text-body-s text-ink-2">
          Può recensire solo chi ha inviato una richiesta verificata a quel partner. I partner possono rispondere, non
          cancellare.
        </p>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-caption text-ink-2">Valutazione media</dt>
            <dd className="font-display text-h2">{formatRating(stats.average)} / 5</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-2">Recensioni</dt>
            <dd className="font-display text-h2">{stats.reviews.toLocaleString("it-IT")}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-caption text-ink-2">Partner verificati in Veneto</dt>
            <dd className="font-display text-h2">{stats.partners}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
