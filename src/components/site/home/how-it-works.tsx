"use client";

import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Check,
  Clock,
  MapPin,
  Search,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { TIMINGS } from "@/lib/leads/options";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Descrivi il lavoro",
    text: "Scrivi con parole tue cosa ti serve e dove. «Rifare il bagno a Mestre» basta per partire.",
  },
  {
    title: "Confronta chi lavora in zona",
    text: "Prezzi indicativi, zone servite, tempi di risposta e lavori già svolti.",
  },
  {
    title: "Richiedi un contatto",
    text: "Un modulo guidato in pochi passi. La confermi con un codice via email: niente richieste false.",
  },
  {
    title: "Vieni richiamato",
    text: "Il professionista ti chiama nella fascia oraria che hai scelto. Se non può, ti proponiamo altri della tua zona.",
  },
];

const STEP_MS = 6000;

/**
 * "Come funziona" sul modello di Thumbtack: i passi a sinistra (elenco ordinato, CLAUDE.md), a destra un telefono
 * che mostra la schermata del passo. Avanza da solo finché nessuno tocca, si ferma fuori schermo
 * e con "riduci movimento". Il telefono è un'illustrazione: per i lettori di schermo contano i passi.
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  // Avanza da solo finché nessuno sceglie un passo.
  const [auto, setAuto] = useState(true);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.35,
    });
    if (root.current) io.observe(root.current);
    return () => io.disconnect();
  }, []);

  const running = auto && !reduced && visible && !hover;
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(
      () => setActive((a) => (a + 1) % STEPS.length),
      STEP_MS,
    );
    return () => window.clearTimeout(id);
  }, [running, active]);

  return (
    <section ref={root} aria-labelledby="come-funziona" className="bg-surface">
      <div className="container-page py-28 md:py-36">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-20">
          <div className="flex flex-col gap-8">
            <div data-reveal className="flex flex-col gap-3">
              <h2
                id="come-funziona"
                className="font-display text-[2.25rem] leading-[1.08] tracking-[-0.02em] md:text-display-l"
              >
                Come funziona
              </h2>
              <p className="max-w-md text-body-l text-neutro-700">
                Dalla ricerca alla telefonata, in quattro passi.
              </p>
            </div>
            <ol
              data-reveal
              className="flex flex-col gap-2"
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
            >
              {STEPS.map((s, i) => {
                const on = i === active;
                return (
                  <li key={s.title}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setActive(i);
                        setAuto(false);
                      }}
                      className={cn(
                        "relative flex w-full gap-4 overflow-hidden rounded-lg p-5 text-left transition-[background-color,box-shadow] duration-200",
                        on
                          ? "bg-page ring-1 ring-line-strong"
                          : "hover:bg-page",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-body-s font-bold transition-colors duration-200",
                          on
                            ? "bg-primary text-on-brand"
                            : "bg-subtle text-primary",
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "text-h4 font-semibold transition-colors md:text-h3",
                            on ? "text-ink" : "text-ink-2",
                          )}
                        >
                          {s.title}
                        </span>
                        <span
                          className={cn(
                            "text-body transition-colors",
                            on ? "text-ink" : "text-ink-2",
                          )}
                        >
                          {s.text}
                        </span>
                      </span>
                      {on && running && (
                        <span
                          aria-hidden
                          className="absolute inset-x-5 bottom-0 h-0.5 overflow-hidden rounded-full bg-subtle"
                        >
                          <span
                            key={active}
                            className="block h-full origin-left animate-[step-progress_linear_forwards] bg-primary"
                            style={{ animationDuration: `${STEP_MS}ms` }}
                          />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div
            data-reveal
            className="relative flex justify-center rounded-xl sage-wash px-6 py-12 md:py-16"
          >
            <Phone active={active} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Telefono disegnato in HTML con le schermate vere dell'app, senza nomi, voti o prezzi inventati. */
function Phone({ active }: { active: number }) {
  const screens = [
    <ScreenSearch key="s" />,
    <ScreenCompare key="c" />,
    <ScreenRequest key="r" />,
    <ScreenDone key="d" />,
  ];
  return (
    <div
      aria-hidden
      data-ui
      className="w-[17.5rem] rounded-[2.75rem] bg-neutro-900 p-2.5 select-none md:w-[18.5rem]"
    >
      <div className="relative h-[36rem] overflow-hidden rounded-[2.2rem] bg-page text-ink">
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold">
          <span>9:41</span>
          <span className="h-5 w-20 rounded-full bg-neutro-900" />
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-[3px] border border-ink" />
          </span>
        </div>
        {screens.map((screen, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-x-0 top-9 bottom-0 flex flex-col px-4 pb-5 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              i === active
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-4 opacity-0",
            )}
          >
            {screen}
          </div>
        ))}
      </div>
    </div>
  );
}

function AppBar({ title }: { title: string }) {
  return (
    <p className="pt-3 pb-4 font-display text-[1.375rem] leading-tight">
      {title}
    </p>
  );
}

function ScreenSearch() {
  return (
    <>
      <AppBar title="Di cosa hai bisogno?" />
      <div className="flex flex-col gap-2 rounded-lg bg-surface p-2 shadow-float">
        <div className="flex items-center gap-2 rounded-md bg-page px-3 py-2.5 text-[13px]">
          <Search className="size-4 shrink-0" />
          <span>
            Rifare il bagno
            <span className="phone-caret ml-px inline-block h-3.5 w-px translate-y-0.5 bg-ink" />{" "}
            {/* taste-skill-ignore: cursore del campo, dentro il telefono data-ui */}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-[13px]">
          <MapPin className="size-4 shrink-0 text-ink-2" /> Mestre (VE)
        </div>
      </div>
      <p className="mt-5 mb-2 text-[11px] font-bold text-ink-2 uppercase">
        Suggerimenti
      </p>
      <ul className="flex flex-col rounded-lg bg-surface text-[13px]">
        {[
          "Rifacimento bagno · Idraulici",
          "Imprese di ristrutturazioni",
          "Vasca con doccia",
        ].map((t, i) => (
          <li
            key={t}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 whitespace-nowrap",
              i > 0 && "border-t border-line",
            )}
          >
            {" "}
            {/* taste-skill-ignore: elenco dell'app nel telefono data-ui */}
            <Search className="size-3.5 shrink-0 text-ink-2" />
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-5 mb-2 text-[11px] font-bold text-ink-2 uppercase">
        Più cercati
      </p>
      <div className="flex flex-wrap gap-1.5 text-[11px] font-medium text-brand">
        {["Certificato APE", "Valutazione casa", "Cappotto termico"].map(
          (t) => (
            <span key={t} className="rounded-full bg-subtle px-2.5 py-1">
              {t}
            </span>
          ),
        )}
      </div>
      <span className="mt-auto inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-on-brand">
        Trova chi fa per te
      </span>
    </>
  );
}

function ScreenCompare() {
  return (
    <>
      <AppBar title="Idraulici a Venezia" />
      <div className="mb-3 flex gap-1.5 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-on-brand">
          <SlidersHorizontal className="size-3" /> Filtri
        </span>
        <span className="rounded-full bg-surface px-2.5 py-1 whitespace-nowrap">
          Verificati
        </span>
        <span className="rounded-full bg-surface px-2.5 py-1 whitespace-nowrap">
          Con prezzi
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-9 items-center justify-center rounded-md bg-brand-soft text-brand">
                <Wrench className="size-4" />
              </span>
              <span className="flex flex-1 flex-col gap-1.5">
                <span
                  className={cn(
                    "h-2.5 rounded-full bg-neutro-200",
                    i === 0 ? "w-28" : "w-24",
                  )}
                />
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                  <BadgeCheck className="size-3" /> Verificato
                </span>
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] text-ink-2">
              <Clock className="size-3" /> Tempo medio di risposta
            </span>
            <span className="self-start rounded-full bg-subtle px-2 py-0.5 text-[10px] font-medium text-brand">
              Prezzi indicativi nel listino
            </span>
            <span className="mt-0.5 inline-flex h-8 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-on-brand">
              Richiedi contatto
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function ScreenRequest() {
  return (
    <>
      <div className="pt-3">
        <p className="text-[11px] font-semibold text-ink-2">Passo 3 di 5</p>
        <span className="mt-1.5 block h-1 rounded-full bg-subtle">
          <span className="block h-full w-3/5 rounded-full bg-primary" />
        </span>
      </div>
      <AppBar title="Quando vorresti iniziare?" />
      <ul className="flex flex-col gap-2 text-[13px]">
        {TIMINGS.map((t, i) => (
          <li
            key={t}
            className={cn(
              "flex items-center gap-2.5 rounded-md border bg-surface px-3 py-2.5",
              i === 0 ? "border-primary bg-subtle" : "border-line",
            )}
          >
            <span
              className={cn(
                "inline-flex size-4 items-center justify-center rounded-full border",
                i === 0 ? "border-primary" : "border-neutro-300",
              )}
            >
              {i === 0 && <span className="size-2 rounded-full bg-primary" />}
            </span>
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-2.5 rounded-md bg-surface px-3 py-2.5 text-[11px] text-ink-2">
        <span className="flex gap-1">
          {["4", "8", "2", "", "", ""].map((d, i) => (
            <span
              key={i}
              className="inline-flex h-6 w-4.5 items-center justify-center rounded-sm bg-page text-[12px] font-semibold text-ink"
            >
              {d}
            </span>
          ))}
        </span>
        Codice via email
      </div>
      <span className="mt-auto inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-on-brand">
        Continua
      </span>
    </>
  );
}

function ScreenDone() {
  return (
    <>
      <div className="flex flex-col items-center pt-8 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-subtle text-primary">
          <Check className="size-8" strokeWidth={2.5} />
        </span>
        <p className="mt-4 font-display text-[1.375rem]">Richiesta inviata!</p>
        <p className="mt-1.5 px-2 text-[13px] text-ink-2">
          Ti richiameranno nella fascia che hai scelto:
        </p>
        <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[13px] font-semibold">
          <Clock className="size-3.5" /> 14:00 – 18:00
        </span>
      </div>
      <div className="mt-6 flex flex-col items-center gap-2 rounded-lg bg-surface p-4 text-center">
        <p className="text-[12px] font-semibold">Non ti hanno chiamato?</p>
        <p className="text-[11px] text-ink-2">
          Ti proponiamo altri professionisti della tua zona
        </p>
      </div>
      <span className="mt-auto inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-primary text-[13px] font-semibold text-primary">
        Torna alla ricerca
      </span>
    </>
  );
}
