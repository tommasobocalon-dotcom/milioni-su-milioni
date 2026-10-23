import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Check } from "lucide-react";
import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { CategoryIcon } from "@/components/site/category-icon";
import { Geco } from "@/components/site/geco";
import { PartnerCard } from "@/components/site/partner-card";
import { SearchBar } from "@/components/site/search-bar";
import { ButtonLink } from "@/components/ui/button";
import { findPlace, getCategories, getCategoryBySlug } from "@/lib/data/catalog";
import { searchPartners } from "@/lib/data/search";
import { db } from "@/lib/db/client";
import { formatRating } from "@/lib/domain/format";

const POPULAR = ["Certificato APE", "Rifare il bagno", "Valutazione casa", "Pratiche catastali", "Cappotto termico"];

export default function HomePage() {
  return (
    <>
      <section className="container-page grid items-center gap-10 pt-12 pb-16 md:grid-cols-[1fr_auto] md:pt-20">
        <div className="flex max-w-3xl flex-col gap-6">
          <p className="caps-label text-primary">Venezia · Padova · Treviso</p>
          <h1 className="font-display text-h1 md:text-display-xl">Casa e lavori di casa: trova chi fa per te.</h1>
          <p className="max-w-2xl text-body-l text-ink-2">
            Confronta agenzie immobiliari, tecnici e artigiani verificati della tua zona. Richiedi un contatto in pochi
            minuti: niente chiamate a vuoto.
          </p>
          <SearchBar />
          <p className="flex flex-wrap items-center gap-2 text-body-s text-ink-2">
            <span>Più cercati:</span>
            {POPULAR.map((q) => (
              <Link
                key={q}
                href={`/cerca?q=${encodeURIComponent(q)}`}
                className="rounded-full bg-subtle px-3 py-1 font-medium text-brand hover:bg-brand-soft"
              >
                {q}
              </Link>
            ))}
          </p>
        </div>
        <div className="relative hidden md:block">
          <p className="absolute -top-6 -left-24 max-w-52 rounded-lg border border-line bg-surface px-4 py-3 text-body-s shadow-float">
            Ciao! Sono il geco. Ti aiuto a trovare la persona giusta.
          </p>
          <Geco outfit="saluto" size={260} priority />
        </div>
      </section>

      <section aria-label="Le due sezioni" className="container-page grid gap-6 pb-16 md:grid-cols-2">
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

      <section className="container-page pb-16" aria-labelledby="categorie">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="categorie" className="font-display text-h2">
              Lavori più richiesti in Veneto
            </h2>
            <p className="text-body-s text-ink-2">Scegli una categoria e filtra per comune.</p>
          </div>
          <Link href="/trova-professionista" className="inline-flex items-center gap-1 text-body-s font-semibold text-primary hover:underline">
            Tutte le categorie <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <CategoryTiles />
      </section>

      <section className="bg-surface py-16" aria-labelledby="come-funziona">
        <div className="container-page">
          <h2 id="come-funziona" className="mb-8 text-center font-display text-h2">
            Come funziona
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {[
              ["Cerca e confronta", "Filtra per zona e tipo di lavoro. Confronta stelle, prezzi indicativi e tempi di risposta."],
              ["Richiedi un contatto", "Un modulo guidato ti aiuta a spiegare il lavoro. Verifichiamo il numero con un SMS."],
              ["Vieni ricontattato", "Il professionista ti richiama nella fascia oraria che preferisci. Poi lasci una recensione verificata."],
            ].map(([title, text], i) => (
              <li key={title} className="flex flex-col gap-3 rounded-lg bg-page p-6">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary font-semibold text-on-brand">
                  {i + 1}
                </span>
                <h3 className="text-h4 font-semibold">{title}</h3>
                <p className="text-body-s text-ink-2">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-16" aria-labelledby="in-evidenza">
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

      <section className="container-page pb-20">
        <div className="flex flex-col items-start gap-6 rounded-xl bg-brand p-8 text-on-brand md:flex-row md:items-center md:p-10">
          <Geco outfit="partner" size={120} />
          <div className="flex flex-1 flex-col gap-2">
            <p className="caps-label text-on-brand-muted">Per agenzie, studi tecnici e artigiani</p>
            <h2 className="font-display text-h2">Ricevi richieste qualificate dalla tua zona</h2>
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
    <div className={`flex items-center gap-4 rounded-xl p-8 ${dark ? "bg-brand text-on-brand" : "bg-brand-soft text-ink"}`}>
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
      <Geco outfit={props.outfit} size={150} className="hidden sm:block" />
    </div>
  );
}

async function CategoryTiles() {
  const categories = await getCategories();
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((c) => (
        <li key={c.id}>
          <Link
            href={c.partnerType === "agency" ? "/trova-casa" : `/trova-professionista?categoria=${c.slug}`}
            className="flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-4 hover:border-line-strong"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-subtle text-primary">
              <CategoryIcon name={c.icon} className="size-5" />
            </span>
            <span className="text-body font-semibold">{c.pluralName}</span>
            <span className="text-caption text-ink-2">
              {c.partnerCount} partner in Veneto
            </span>
          </Link>
        </li>
      ))}
    </ul>
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
