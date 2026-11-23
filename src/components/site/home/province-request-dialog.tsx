"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, CircleCheck, X } from "lucide-react";
import { requestProvince, type ProvinceRequestResult } from "@/app/(pubblico)/province-actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PROVINCE_NEEDS, PROVINCE_NOTE_MAX } from "@/lib/domain/coverage";
import type { ProvinceRequestField } from "@/lib/domain/province-request";
import { Turnstile } from "../turnstile";

type Province = { code: string; name: string };
type Failure = Extract<ProvinceRequestResult, { ok: false }>;

/**
 * Finestra "Inoltra una richiesta" per le province dove non siamo ancora (mappa della Home). <dialog> nativo: tiene
 * il focus dentro, si chiude con Esc, con la X o toccando fuori, e alla chiusura il focus torna su chi l'ha aperta.
 */
export function ProvinceRequestDialog({ province, onClose }: { province: Province | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const downOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (province && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>("input")?.focus();
    }
    if (!province && dialog.open) dialog.close();
  }, [province]);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Chiude solo se il tocco inizia e finisce fuori dal riquadro: selezionare testo nel modulo non la chiude.
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => downOnBackdrop.current && e.target === e.currentTarget && close()}
      aria-labelledby="richiesta-provincia-titolo"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl bg-surface p-0 text-ink shadow-float backdrop:bg-neutro-900/50"
    >
      {province && <ProvinceRequestForm key={province.code} province={province} onClose={close} />}
    </dialog>
  );
}

function ProvinceRequestForm({ province, onClose }: { province: Province; onClose: () => void }) {
  const [error, setError] = useState<Failure | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    const input = Object.fromEntries(["need", "place", "note", "email"].map((k) => [k, String(data.get(k) ?? "")])) as Record<ProvinceRequestField, string>;
    start(async () => {
      const res = await requestProvince({ ...input, province: province.code }, turnstileToken);
      if (res.ok) setSent(res.email);
      else {
        setError(res);
        setTurnstileReset((n) => n + 1);
      }
    });
  }

  const err = (f: ProvinceRequestField) => (error?.field === f ? error.error : undefined);
  // Il testo sotto il campo (errore o "Facoltativo") è collegato al campo, come in Field.
  const aria = (f: ProvinceRequestField, id: string, help = false) => ({
    "aria-invalid": error?.field === f,
    "aria-describedby": error?.field === f ? `${id}-error` : help ? `${id}-help` : undefined,
  });

  return (
    <div className="relative flex flex-col gap-5 p-6 sm:p-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
      >
        <X className="size-5" aria-hidden />
        <span className="sr-only">Chiudi</span>
      </button>

      <div className="flex flex-col gap-2 pr-8">
        <h2 id="richiesta-provincia-titolo" className="font-display text-h3 tracking-[-0.01em] text-balance">
          Non siamo ancora in provincia di {province.name}
        </h2>
        <p className="text-body text-ink-2">
          Siamo partiti da Treviso e arriveremo prima nelle province da cui riceviamo più richieste. Dicci cosa cerchi: ti scriviamo quando
          arriviamo.
        </p>
      </div>

      {sent ? (
        <div className="flex flex-col gap-4" role="status">
          <p className="inline-flex items-center gap-2 text-h4 font-semibold text-primary">
            <CircleCheck className="size-6" aria-hidden /> Richiesta inoltrata
          </p>
          <p className="text-body">
            Ti scriviamo a <strong className="break-all">{sent}</strong> quando arriviamo in provincia di {province.name}.
          </p>
          <Button type="button" variant="secondary" onClick={onClose} autoFocus className="self-start">
            Chiudi
          </Button>
        </div>
      ) : (
        <form method="post" onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <fieldset className="flex flex-col gap-2" aria-describedby={err("need") ? "rp-need-error" : undefined}>
            <legend className="mb-1.5 text-body-s font-semibold text-ink">
              Cosa cerchi?<span className="text-error"> *</span>
            </legend>
            {PROVINCE_NEEDS.map((n) => (
              <label
                key={n.value}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-4 py-3 text-body transition-colors hover:border-line-strong has-checked:border-primary has-checked:bg-subtle has-checked:font-semibold"
              >
                <input type="radio" name="need" value={n.value} required className="size-4 accent-primary" />
                {n.label}
              </label>
            ))}
            {err("need") && (
              <p id="rp-need-error" className="text-caption text-error" role="alert">
                {err("need")}
              </p>
            )}
          </fieldset>
          <Field label="Comune" htmlFor="rp-place" help="Facoltativo" error={err("place")}>
            <Input id="rp-place" name="place" list="comuni-veneto" autoComplete="off" maxLength={80} {...aria("place", "rp-place", true)} />
          </Field>
          <Field label="Che lavoro devi fare?" htmlFor="rp-note" help="Facoltativo" error={err("note")}>
            <Input id="rp-note" name="note" maxLength={PROVINCE_NOTE_MAX} placeholder="Es. rifare il bagno, vendere casa" {...aria("note", "rp-note", true)} />
          </Field>
          <Field label="Email" htmlFor="rp-email" required error={err("email")}>
            <Input id="rp-email" name="email" type="email" autoComplete="email" inputMode="email" required {...aria("email", "rp-email")} />
          </Field>
          <p className="text-caption text-ink-2">
            Usiamo l&apos;email solo per avvisarti quando arriviamo in provincia di {province.name}.{" "}
            <Link href="/privacy" className="font-semibold text-primary underline">
              Privacy
            </Link>
          </p>
          <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />
          {error && (!error.field || error.field === "province") && (
            <p role="alert" className="rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error">
              {error.error}
            </p>
          )}
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Invio…" : "Inoltra la richiesta"} <ArrowRight aria-hidden />
          </Button>
        </form>
      )}
    </div>
  );
}
