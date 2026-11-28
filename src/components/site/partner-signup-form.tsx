"use client";

import { startTransition, useActionState } from "react";
import Link from "next/link";
import { registerPartner, type SignupState } from "@/app/(pubblico)/registrazione-partner/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

type Option = { value: string; label: string };
export type OptionGroup = { label: string; options: Option[] };

/** Dati aziendali, attività e sede (PRD §6.1). Il piano si sceglie al passo successivo, nella pagina Abbonamento. */
export function PartnerSignupForm({ categories, places }: { categories: OptionGroup[]; places: OptionGroup[] }) {
  const [state, action, pending] = useActionState<SignupState, FormData>(registerPartner, {});
  const invalid = (f: string) => (state.field === f ? { "aria-invalid": true, "aria-describedby": `${f}-error` } : {});
  const error = (f: string) => (state.field === f ? state.error : undefined);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        // Invio manuale: con action={...} React svuota il modulo anche quando il server risponde con un errore.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-6"
    >
      <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        <h2 className="text-h3 font-semibold">La tua attività</h2>
        <Field label="Cosa fai" htmlFor="categoryId" required error={error("categoryId")}>
          <Select id="categoryId" name="categoryId" required defaultValue="" {...invalid("categoryId")}>
            <option value="" disabled>
              Scegli la categoria
            </option>
            {categories.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="Nome sulla scheda" htmlFor="displayName" required help="Come ti cercano i clienti, es. Idraulica Bianchi" error={error("displayName")}>
          <Input id="displayName" name="displayName" required maxLength={80} autoComplete="organization" {...invalid("displayName")} />
        </Field>
        <Field label="Presentazione in una frase" htmlFor="tagline" required help="Compare nei risultati di ricerca. La descrizione completa la scrivi dopo." error={error("tagline")}>
          <Input id="tagline" name="tagline" required maxLength={120} placeholder="Impianti idraulici e caldaie a Padova e provincia" {...invalid("tagline")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Comune della sede" htmlFor="municipalityId" required help="La provincia diventa la tua prima zona servita." error={error("municipalityId")}>
            <Select id="municipalityId" name="municipalityId" required defaultValue="" {...invalid("municipalityId")}>
              <option value="" disabled>
                Scegli il comune
              </option>
              {places.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Telefono" htmlFor="phone" required error={error("phone")}>
            <Input id="phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" {...invalid("phone")} />
          </Field>
        </div>
        <Field label="Indirizzo della sede" htmlFor="address" required error={error("address")}>
          <Input id="address" name="address" required maxLength={200} autoComplete="street-address" placeholder="Via Roma 1" {...invalid("address")} />
        </Field>
      </section>

      <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 font-semibold">Dati per la fattura</h2>
          <p className="text-body-s text-ink-2">Servono per la fattura elettronica di abbonamento e pacchetti.</p>
        </div>
        <Field label="Ragione sociale" htmlFor="businessName" required error={error("businessName")}>
          <Input id="businessName" name="businessName" required maxLength={160} {...invalid("businessName")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Partita IVA" htmlFor="vatNumber" required error={error("vatNumber")}>
            <Input id="vatNumber" name="vatNumber" required inputMode="numeric" maxLength={16} {...invalid("vatNumber")} />
          </Field>
          <Field label="Codice fiscale" htmlFor="taxCode" help="Solo se diverso dalla partita IVA" error={error("taxCode")}>
            <Input id="taxCode" name="taxCode" maxLength={16} className="uppercase" {...invalid("taxCode")} />
          </Field>
          <Field label="Codice destinatario SDI" htmlFor="sdiCode" help="7 caratteri. Oppure compila la PEC." error={error("sdiCode")}>
            <Input id="sdiCode" name="sdiCode" maxLength={7} className="uppercase" {...invalid("sdiCode")} />
          </Field>
          <Field label="PEC" htmlFor="pec" error={error("pec")}>
            <Input id="pec" name="pec" type="email" maxLength={200} {...invalid("pec")} />
          </Field>
        </div>
      </section>

      <div className="flex flex-col gap-4">
        <label className="flex items-start gap-3 text-body-s">
          <input type="checkbox" name="terms" required className="mt-0.5 size-5 shrink-0 accent-primary" {...invalid("terms")} />
          <span>
            Accetto i{" "}
            <Link href="/termini" target="_blank" className="font-semibold text-primary underline">
              termini e condizioni
            </Link>
            , comprese le regole per le aziende, e ho letto l&apos;
            <Link href="/privacy" target="_blank" className="font-semibold text-primary underline">
              Informativa privacy
            </Link>
            . GecoItalia mette solo in contatto e non risponde dei rapporti tra la mia azienda e i clienti. *
          </span>
        </label>
        {/* Gli errori dei campi compaiono sotto il campo; qui quelli generali e quello della casella dei termini. */}
        {state.error && (!state.field || state.field === "terms") && (
          <p role="alert" className="rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Creazione della scheda…" : "Continua: scegli il piano"}
        </Button>
      </div>
    </form>
  );
}
