"use client";

import { useState } from "react";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { HERO_SEARCH_ID } from "@/lib/data/home-content";
import { cn } from "@/lib/utils";

type Field = "q" | "dove";

/**
 * Ricerca della hero: "cosa ti serve" è obbligatorio, il comune no (si può scrivere anche nella frase,
 * "rifare il bagno a Mestre", e /cerca lo trova). Senza JavaScript basta `required` del browser; con JavaScript
 * il fumetto del browser è sostituito da "Campo obbligatorio" sotto il campo.
 * La datalist dei comuni arriva come children dal componente server.
 */
export function HeroSearchForm({ children }: { children: React.ReactNode }) {
  const [missing, setMissing] = useState<Partial<Record<Field, boolean>>>({});

  function onInvalid(e: React.FormEvent<HTMLInputElement>) {
    e.preventDefault();
    const input = e.currentTarget;
    setMissing((m) => ({ ...m, [input.name]: true }));
    // L'evento arriva per ogni campo non valido: il fuoco va solo al primo.
    if (input.form?.querySelector(":invalid") === input) input.focus();
  }

  function onInput(e: React.FormEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    if (missing[input.name as Field] && input.value.trim()) setMissing((m) => ({ ...m, [input.name]: false }));
  }

  const fieldProps = (name: Field) => ({
    name,
    required: name === "q",
    pattern: name === "q" ? ".*\\S.*" : undefined,
    onInvalid,
    onInput,
    "aria-invalid": missing[name] || undefined,
    "aria-describedby": missing[name] ? `hero-${name}-errore` : undefined,
  });

  return (
    <form
      id={HERO_SEARCH_ID}
      action="/cerca"
      method="get"
      role="search"
      aria-label="Cerca un professionista o un'agenzia"
      className="hero-rise flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 text-ink shadow-float [animation-delay:160ms]"
    >
      <div className="flex flex-col">
        <label
          className={cn(
            "flex items-center gap-2 rounded-md px-1 py-0.5 focus-within:ring-2 focus-within:ring-primary",
            missing.q && "ring-2 ring-error focus-within:ring-error",
          )}
        >
          <Search className="size-6 shrink-0 text-ink" aria-hidden />
          <span className="sr-only">Di cosa hai bisogno?</span>
          <input
            {...fieldProps("q")}
            placeholder="Es. vendere casa, rifare il bagno a Mestre"
            autoComplete="off"
            // Sul telefono l'esempio è più piccolo per stare in una riga; il testo scritto resta a 16 px (niente zoom su iPhone).
            className="w-full min-w-0 bg-transparent text-body text-ink placeholder:text-[clamp(12px,3.4vw,16px)] placeholder:text-ink-2 focus:outline-none"
          />
        </label>
        {missing.q && <FieldError id="hero-q-errore" />}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex flex-col sm:w-56">
          <label
            className={cn(
              "flex h-10 items-center gap-2 rounded-full border border-neutro-300 pr-2.5 pl-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary",
              missing.dove && "border-error focus-within:border-error",
            )}
          >
            <MapPin className="size-4 shrink-0 text-ink-2" aria-hidden />
            <span className="sr-only">Comune (facoltativo)</span>
            <input
              {...fieldProps("dove")}
              list="comuni-veneto"
              placeholder="Comune"
              autoComplete="off"
              className="w-full min-w-0 bg-transparent text-body text-ink placeholder:text-ink-2 focus:outline-none"
            />
          </label>
          {missing.dove && <FieldError id="hero-dove-errore" />}
        </div>
        <button
          type="submit"
          className="group/cta inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand px-5 text-body-s font-bold text-on-brand transition-[background-color,transform] duration-150 hover:bg-bosco-700 active:scale-[0.98] sm:flex-1"
        >
          Trova chi fa per te
          <ArrowRight className="size-4 transition-transform duration-200 group-hover/cta:translate-x-1" aria-hidden />
        </button>
      </div>
      {children}
    </form>
  );
}

function FieldError({ id }: { id: string }) {
  return (
    <p id={id} className="mt-1.5 px-2 text-caption font-semibold text-error sm:px-3">
      Campo obbligatorio
    </p>
  );
}
