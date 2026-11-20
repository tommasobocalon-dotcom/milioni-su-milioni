import type { Metadata } from "next";
import Link from "next/link";
import { Award, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  alternates: { canonical: "/come-ordiniamo-i-risultati" },
  title: "Come ordiniamo i risultati",
  description:
    "Con quali criteri ordiniamo agenzie, tecnici e artigiani nei risultati e quali posti sono a pagamento. Contenuti sponsorizzati sempre etichettati.",
};

/** I gradi della classifica, con gli stessi colori delle schede nei risultati (PartnerCard). */
const TIERS = [
  {
    plan: "Premium",
    note: "in evidenza",
    premium: true,
    boosted: true,
    width: "w-full",
  },
  {
    plan: "Premium",
    note: "",
    premium: true,
    boosted: false,
    width: "w-[92%]",
  },
  {
    plan: "Normal",
    note: "in evidenza",
    premium: false,
    boosted: true,
    width: "w-[84%]",
  },
  {
    plan: "Normal",
    note: "",
    premium: false,
    boosted: false,
    width: "w-[76%]",
  },
  {
    plan: "Altre aziende",
    note: "",
    premium: false,
    boosted: false,
    width: "w-[68%]",
  },
];

const SPONSORED = [
  {
    figure: "24 o 48 ore",
    title: "In evidenza nella ricerca",
    text: "L'azienda sale tra quelle del suo gruppo nella sua categoria e provincia. Il riquadro grande in cima va a un'azienda Premium: prima a chi ha comprato questo pacchetto, poi a rotazione tra gli altri.",
  },
  {
    figure: "7 o 30 giorni",
    title: "Logo in Home",
    text: 'Il logo entra nella fascia "Aziende in evidenza", dove i loghi scorrono in un ordine che cambia a ogni visita.',
  },
  {
    figure: "30 giorni",
    title: "Altri comuni, uno per uno",
    text: "L'azienda compare anche nelle ricerche di altri comuni del Veneto, con lo stesso ordine delle altre.",
  },
];

/**
 * Trasparenza sulla classifica e sui posti a pagamento (Omnibus, art. 22 Codice del Consumo; P2B): spostata da
 * "Come funziona" il 15/11/2026, su richiesta del cliente, così quella pagina parla solo a chi cerca. Ci rimandano
 * footer, risultati di ricerca, fascia "Aziende in evidenza" della Home, Chi siamo e Assistenza. Ancore
 * #ordinamento e #sponsorizzati.
 */
export default function RankingPage() {
  return (
    <>
      <section className="bg-brand text-on-brand">
        <div className="container-page flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <h1 className="hero-rise font-display text-h1 md:text-display-l">Come ordiniamo i risultati</h1>
          <p className="hero-rise max-w-[40rem] text-body-l [animation-delay:90ms]">
            Quali aziende vedi quando cerchi, in che ordine, e quali posti sono a pagamento. I contenuti sponsorizzati sono sempre
            etichettati.
          </p>
        </div>
      </section>

      <section
        id="ordinamento"
        aria-labelledby="ordinamento-titolo"
        className="scroll-mt-20 bg-surface py-24 md:py-36"
      >
        <div className="container-page flex flex-col gap-12 md:gap-16">
          <h2
            data-reveal
            id="ordinamento-titolo"
            className="text-center font-display text-h1 md:text-display-l"
          >
            Dal primo all&apos;ultimo
          </h2>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
            <div data-reveal className="flex flex-col gap-5">
              <p className="text-body-l">
                Mostriamo solo le aziende che lavorano nella categoria e nella
                zona che cerchi. Poi vengono prima le aziende Premium, poi le
                Normal, poi le altre aziende; dentro ogni gruppo salgono
                quelle in evidenza.
              </p>
              <p className="text-body">
                Premium e Normal sono abbonamenti a pagamento delle aziende: il
                posto in classifica dipende dall&apos;abbonamento, non da un giudizio sulla qualità del lavoro. Il riquadro
                grande in cima è uno spazio a pagamento delle aziende Premium e porta sempre l&apos;etichetta
                &quot;Sponsorizzato&quot;.
              </p>
              <p id="verificato" className="scroll-mt-24 text-body">
                Il badge <strong>Verificato</strong> vuol dire che il nostro team ha controllato i dati dell&apos;azienda,
                partita IVA compresa. Non dipende dall&apos;abbonamento e non cambia l&apos;ordine dei risultati.
              </p>
              <p className="text-body">
                Tra aziende dello stesso gruppo l&apos;ordine cambia da un
                visitatore all&apos;altro, così nessuna resta sempre prima. Se
                preferisci, puoi ordinare tu i risultati per distanza.
              </p>
            </div>

            <ol
              className="flex flex-col gap-3"
              aria-label="Ordine dei risultati, dal primo all'ultimo"
            >
              {TIERS.map((t, i) => (
                <li
                  key={`${t.plan}-${t.note}`}
                  data-reveal
                  style={
                    { "--reveal-shift": `${i * 4}%` } as React.CSSProperties
                  }
                  className={cn(
                    "flex min-h-20 items-center gap-4 rounded-lg px-5 py-4 transition-transform duration-300 motion-safe:hover:-translate-y-0.5",
                    t.width,
                    t.premium
                      ? t.boosted
                        ? "bg-lavanda-300"
                        : "bg-tertiary"
                      : t.plan === "Normal"
                        ? t.boosted
                          ? "bg-brand-soft/80"
                          : "bg-brand-soft/40"
                        : "border border-line bg-page",
                  )}
                >
                  <span
                    aria-hidden
                    className="w-10 shrink-0 font-display text-h1 leading-none text-primary"
                  >
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      {t.premium ? (
                        <Star
                          className="size-4 fill-ambra-500 text-ambra-500"
                          aria-hidden
                        />
                      ) : t.plan === "Normal" ? (
                        <Award className="size-4 text-primary" aria-hidden />
                      ) : null}
                      {t.plan}
                    </span>
                    {t.note && (
                      <span className="text-body-s text-ink-2">{t.note}</span>
                    )}
                  </span>
                  {t.boosted && (
                    <Badge
                      kind="sponsored"
                      className="hidden h-7 bg-surface px-2.5 text-body-s font-semibold sm:inline-flex"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section
        id="sponsorizzati"
        aria-labelledby="sponsorizzati-titolo"
        className="scroll-mt-20 bg-brand-soft py-24 md:py-36"
      >
        <div className="container-page flex flex-col gap-14">
          <div
            data-reveal
            className="flex flex-col items-center gap-4 text-center"
          >
            <h2
              id="sponsorizzati-titolo"
              className="font-display text-h1 md:text-display-l"
            >
              Contenuti sponsorizzati
            </h2>
            <p className="max-w-[44rem] text-body-l">
              I posti in evidenza li riconosci sempre dalla scritta{" "}
              <Badge
                kind="sponsored"
                className="mx-0.5 h-7 translate-y-[-2px] bg-surface px-2.5 text-body-s font-semibold"
              />
              , anche sui lavori in evidenza nella pagina Ispirazione.
            </p>
          </div>
          <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
            {SPONSORED.map((s, i) => (
              <li
                key={s.title}
                data-reveal
                style={{ "--reveal-shift": `${i * 5}%` } as React.CSSProperties}
                className="flex flex-col gap-3 rounded-lg bg-surface p-6 md:p-8"
              >
                <p className="font-display text-[2.5rem] leading-[1.05] tracking-[-0.03em] lg:text-[3rem]">
                  {s.figure}
                </p>
                <h3 className="text-h3 font-semibold">{s.title}</h3>
                <p className="text-body text-ink-2">{s.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-page py-16">
        <p className="container-page text-center text-body">
          Vuoi sapere come si cerca e si chiede un contatto?{" "}
          <Link href="/come-funziona" className="font-semibold text-primary underline">
            Vedi come funziona
          </Link>
        </p>
      </section>
    </>
  );
}
