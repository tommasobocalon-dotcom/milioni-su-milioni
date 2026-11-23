"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, CircleCheck, X } from "lucide-react";
import { sendAreaRequest, type AreaRequestField, type AreaRequestResult } from "@/app/(pubblico)/area-request-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Turnstile } from "./turnstile";

export type AreaCategory = { id: string; name: string; partnerType: "agency" | "technician" | "artisan" | "b2b" };
export type AreaPlace = { id: number; name: string; provinceCode: string };
/** Provincia non ancora attiva: sigla, nome e un comune d'esempio per il campo Comune. */
export type AreaProvince = { code: string; name: string; city: string };

type Failure = Extract<AreaRequestResult, { ok: false }>;

/**
 * "Inoltra una richiesta" per una provincia non ancora attiva (src/lib/domain/open-areas.ts): cosa cerchi, comune
 * (facoltativo) ed email, per sapere dove aprire dopo Treviso. Nel riquadro della mappa in Home e al posto dei
 * risultati di Trova professionista e Trova casa. Senza `onClose` non mostra i pulsanti per chiudere.
 */
export function AreaRequestForm({
  province,
  categories,
  places,
  titleId,
  defaultCategory,
  defaultPlace,
  onClose,
}: {
  province: AreaProvince;
  categories: AreaCategory[];
  places: AreaPlace[];
  titleId: string;
  defaultCategory?: string;
  defaultPlace?: string;
  onClose?: () => void;
}) {
  const [error, setError] = useState<Failure | null>(null);
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [pending, start] = useTransition();
  const agencies = categories.filter((c) => c.partnerType === "agency");
  const pros = categories.filter((c) => c.partnerType !== "agency");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    const value = (k: AreaRequestField) => String(data.get(k) ?? "");
    start(async () => {
      const res = await sendAreaRequest({ province: province.code, category: value("category"), place: value("place"), email: value("email") }, turnstileToken);
      if (res.ok) setSent(true);
      else {
        setError(res);
        setTurnstileReset((n) => n + 1);
      }
    });
  }

  const err = (f: AreaRequestField) => (error?.field === f ? error.error : undefined);
  const aria = (f: AreaRequestField) => ({ "aria-invalid": error?.field === f, "aria-describedby": error?.field === f ? `zona-${f}-error` : undefined });

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="font-display text-h3 tracking-[-0.01em]">
          {province.name}: non ancora attiva
        </h2>
        {onClose && (
          <button type="button" onClick={onClose} className="-m-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-salvia-100 hover:text-ink">
            <X className="size-5" aria-hidden />
            <span className="sr-only">Chiudi</span>
          </button>
        )}
      </div>

      {sent ? (
        <div role="status" className="flex flex-col gap-3">
          <p className="inline-flex items-center gap-2 text-h4 font-semibold text-primary">
            <CircleCheck className="size-6" aria-hidden /> Richiesta inoltrata
          </p>
          <p className="text-body">Grazie. Ti scriviamo quando arriviamo in provincia di {province.name}.</p>
          {onClose && (
            <Button type="button" variant="secondary" onClick={onClose} className="self-start">
              Chiudi
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-body text-ink-2">
            Partiamo dalla provincia di Treviso. Dicci cosa ti serve: apriamo prima dove arrivano più richieste.
          </p>
          <form method="post" onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <Field label="Cosa cerchi" htmlFor="zona-category" required error={err("category")}>
              <Select id="zona-category" name="category" defaultValue={defaultCategory ?? ""} required {...aria("category")}>
                <option value="" disabled>
                  Scegli…
                </option>
                <optgroup label="Professionisti e artigiani">
                  {pros.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Agenzie immobiliari">
                  {agencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </Field>
            <Field label="Comune" htmlFor="zona-place" error={err("place")} help="Facoltativo">
              <Input
                id="zona-place"
                name="place"
                list="zona-comuni"
                autoComplete="off"
                defaultValue={defaultPlace}
                placeholder={`Es. ${province.city}`}
                {...aria("place")}
              />
              <datalist id="zona-comuni">
                {places.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </Field>
            <Field label="Email" htmlFor="zona-email" required error={err("email")}>
              <Input id="zona-email" name="email" type="email" autoComplete="email" inputMode="email" required {...aria("email")} />
            </Field>
            <p className="text-caption text-ink-2">
              Usiamo la tua email solo per avvisarti quando arriviamo nella tua provincia.{" "}
              <Link href="/privacy" className="underline">
                Informativa
              </Link>
              .
            </p>
            <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />
            {error && !error.field && (
              <p role="alert" className="rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error">
                {error.error}
              </p>
            )}
            <Button type="submit" disabled={pending} className="self-start">
              {pending ? "Invio…" : "Inoltra la richiesta"} <ArrowRight aria-hidden />
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
