"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { resendLeadCode, submitLeadRequest, verifyLeadRequest } from "@/app/(pubblico)/richiesta/actions";
import { Turnstile } from "@/components/site/turnstile";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { RequestContext } from "@/lib/data/partners";
import { AGENCY_REQUEST_TYPES, CALLBACK_SLOTS, OTHER_REQUEST, TIMINGS } from "@/lib/leads/options";
import { cn } from "@/lib/utils";

const STEPS = ["Tipo di richiesta", "Dettagli", "Luogo e tempi", "I tuoi contatti", "Verifica"];

type Props = {
  ctx: RequestContext;
  places: string[];
  initialServiceSlug?: string;
};

export function LeadWizard({ ctx, places, initialServiceSlug }: Props) {
  const router = useRouter();
  const isAgency = ctx.partner.type === "agency";
  const initialService = ctx.services.find((s) => s.slug === initialServiceSlug) ?? null;

  const [step, setStep] = useState(0);
  const [requestType, setRequestType] = useState(isAgency ? "" : initialService?.name ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [description, setDescription] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [timing, setTiming] = useState<(typeof TIMINGS)[number] | "">("");
  const [slot, setSlot] = useState<(typeof CALLBACK_SLOTS)[number] | "">("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const requestOptions = isAgency ? [...AGENCY_REQUEST_TYPES] : [...ctx.services.map((s) => s.name), OTHER_REQUEST];
  const serviceId = ctx.services.find((s) => s.name === requestType)?.id ?? null;

  function next() {
    setError(null);
    if (step === 0 && !requestType) return setError("Scegli il tipo di richiesta");
    if (step === 1) {
      const missing = ctx.questions.find((q) => q.required && !answers[q.key]);
      if (missing) return setError(`Rispondi a: ${missing.label}`);
    }
    if (step === 2) {
      if (!municipality.trim()) return setError("Scrivi il comune dell'intervento");
      if (!timing) return setError("Dicci quando vorresti iniziare");
      if (!slot) return setError("Scegli quando preferisci essere richiamato");
    }
    if (step === 3) return submit();
    setStep((s) => s + 1);
  }

  function submit() {
    if (!privacy) return setError("Serve il consenso per inviare la richiesta");
    startTransition(async () => {
      const res = await submitLeadRequest({
        partnerSlug: ctx.partner.slug,
        requestType,
        serviceId,
        answers,
        description,
        municipality,
        timing: timing as (typeof TIMINGS)[number],
        callbackSlot: slot as (typeof CALLBACK_SLOTS)[number],
        name,
        email,
        phone,
        privacy: true,
        marketing,
        website,
        turnstileToken,
      });
      if (!res.ok) {
        setError(res.error);
        // Il token Turnstile vale una volta: dopo un errore se ne chiede uno nuovo.
        setTurnstileReset((n) => n + 1);
        if (res.field === "municipality") setStep(2);
        return;
      }
      setLeadId(res.leadId);
      setMaskedEmail(res.maskedEmail);
      setDevCode(res.devCode);
      setStep(4);
    });
  }

  function verify() {
    if (!leadId) return;
    setError(null);
    startTransition(async () => {
      const res = await verifyLeadRequest(leadId, code);
      if (!res.ok) return setError(res.error);
      router.push(`/richiesta/inviata/${res.leadId}`);
    });
  }

  function resend() {
    if (!leadId) return;
    setError(null);
    startTransition(async () => {
      const res = await resendLeadCode(leadId);
      if (!res.ok) return setError(res.error ?? "Non è stato possibile inviare un nuovo codice");
      setDevCode(res.devCode);
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-line bg-surface p-6 md:p-8">
      <div className="flex flex-col gap-2">
        <p className="text-body-s text-ink-2">
          Passo {step + 1} di {STEPS.length} · {STEPS[step]}
        </p>
        <ol className="grid grid-cols-5 gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <li key={s} className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </ol>
      </div>

      <h2 ref={headingRef} tabIndex={-1} className="font-display text-h2 outline-none">
        {
          [
            isAgency ? "Di cosa hai bisogno?" : "Che lavoro ti serve?",
            "Raccontaci qualche dettaglio",
            "Dove e quando?",
            "Come possiamo ricontattarti?",
            "Conferma la tua email",
          ][step]
        }
      </h2>

      {step === 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Tipo di richiesta</legend>
          {requestOptions.map((opt) => (
            <RadioCard key={opt} name="requestType" value={opt} checked={requestType === opt} onChange={setRequestType} />
          ))}
        </fieldset>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {ctx.questions.map((q) => {
            const id = `q-${q.key}`;
            const value = answers[q.key] ?? "";
            const set = (v: string) => setAnswers((a) => ({ ...a, [q.key]: v }));
            return (
              <Field key={q.key} label={q.label} htmlFor={id} help={q.help ?? undefined} required={q.required}>
                {q.type === "select" ? (
                  <Select id={id} value={value} onChange={(e) => set(e.target.value)}>
                    <option value="">Scegli…</option>
                    {q.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id={id}
                    inputMode={q.type === "number" ? "numeric" : undefined}
                    value={value}
                    onChange={(e) => set(q.type === "number" ? e.target.value.replace(/\D/g, "") : e.target.value)}
                  />
                )}
              </Field>
            );
          })}
          <Field
            label="Descrivi il lavoro"
            htmlFor="description"
            help="Più dettagli dai, più preciso sarà il primo contatto. Niente dati sensibili."
            className="sm:col-span-2"
          >
            <Textarea id="description" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <Field label="Comune dell'intervento" htmlFor="municipality" required help="Per ora attivi in Veneto">
            <Input
              id="municipality"
              list="comuni-richiesta"
              autoComplete="address-level2"
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
            />
            <datalist id="comuni-richiesta">
              {places.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-body-s font-semibold">Quando vorresti iniziare? *</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {TIMINGS.map((t) => (
                <RadioCard key={t} name="timing" value={t} checked={timing === t} onChange={(v) => setTiming(v as typeof timing)} />
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-body-s font-semibold">Quando preferisci essere richiamato? *</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {CALLBACK_SLOTS.map((t) => (
                <RadioCard key={t} name="slot" value={t} checked={slot === t} onChange={(v) => setSlot(v as typeof slot)} />
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome e cognome" htmlFor="name" required className="sm:col-span-2">
            <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="email" required help="Ti mandiamo il codice per confermare la richiesta">
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Telefono" htmlFor="phone" required help="L'azienda ti richiama a questo numero">
            <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          {/* Campo esca per i bot, invisibile alle persone */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="website">Sito web</label>
            <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <label className="flex items-start gap-3 text-body-s sm:col-span-2">
            <input type="checkbox" className="mt-0.5 size-5 accent-primary" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
            <span>
              Ho letto l&apos;
              <a href="/privacy" target="_blank" className="font-semibold text-primary underline">
                informativa privacy
              </a>{" "}
              e accetto che i miei dati vengano inviati solo a {ctx.partner.displayName} per ricontattarmi. *
            </span>
          </label>
          <label className="flex items-start gap-3 text-body-s sm:col-span-2">
            <input type="checkbox" className="mt-0.5 size-5 accent-primary" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            <span>Facoltativo: voglio ricevere consigli e novità per la casa via email.</span>
          </label>
          <div className="sm:col-span-2">
            <Turnstile onToken={setTurnstileToken} resetKey={turnstileReset} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <p className="text-body">
            Ti abbiamo inviato un&apos;email con un codice di 6 cifre all&apos;indirizzo <strong>{maskedEmail}</strong>. Solo le
            richieste confermate arrivano ai professionisti: così niente spam, per te e per loro.
          </p>
          {devCode && (
            <p className="rounded-md border border-dashed border-info bg-info-soft p-3 text-body-s text-info">
              Ambiente di prova: le email non partono davvero. Il codice è <strong className="tracking-widest">{devCode}</strong>.
            </p>
          )}
          <Field label="Codice ricevuto via email" htmlFor="code" required>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="max-w-48 text-center text-h3 tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <button type="button" onClick={resend} disabled={pending} className="self-start text-body-s font-semibold text-primary underline">
            Non hai ricevuto il codice? Invialo di nuovo
          </button>
        </div>
      )}

      <p role="alert" aria-live="assertive" className={cn("text-body-s text-error", !error && "sr-only")}>
        {error}
      </p>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
        {step > 0 && step < 4 ? (
          <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={pending}>
            <ArrowLeft aria-hidden /> Indietro
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-caption text-ink-2">
            <Lock className="size-3.5" aria-hidden /> I tuoi dati vanno solo a {ctx.partner.displayName}
          </span>
        )}
        {step < 4 ? (
          <Button type="button" onClick={next} disabled={pending}>
            {step === 3 ? (pending ? "Invio…" : "Invia e verifica") : "Continua"}
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button type="button" onClick={verify} disabled={pending || code.length !== 6}>
            <ShieldCheck aria-hidden /> {pending ? "Verifica…" : "Conferma la richiesta"}
          </Button>
        )}
      </div>
    </div>
  );
}

function RadioCard({ name, value, checked, onChange }: { name: string; value: string; checked: boolean; onChange: (v: string) => void }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-body transition-colors",
        checked ? "border-primary bg-subtle font-semibold" : "border-line hover:border-line-strong",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="size-4 accent-primary" />
      {value}
    </label>
  );
}
