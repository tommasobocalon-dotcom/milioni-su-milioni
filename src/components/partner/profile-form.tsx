"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import { updateProfile, type ActionState } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { LogoPartner } from "@/components/ui/logo-partner";

export type ProfileValues = {
  displayName: string;
  logoUrl: string | null;
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  businessName: string;
  vatNumber: string;
  address: string;
  tagline: string;
  description: string;
  phone: string | null;
  email: string | null;
  specialties: string[];
  /** Una riga per fascia, già pronta per il campo di testo. */
  openingHours: string;
  foundedYear: number | null;
  hideDirectContacts: boolean;
};

const ACCEPT = "image/png,image/jpeg,image/webp";

function ImagePicker({ name, label, current, alt, round }: { name: string; label: string; current: string | null; alt: string; round?: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-4">
      <LogoPartner name={alt} src={preview ?? current} size={88} className={round ? "rounded-full" : undefined} />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={name}
          className="inline-flex cursor-pointer items-center gap-2 self-start rounded-md border border-line px-3 py-2 text-body-s font-semibold hover:bg-subtle focus-within:outline-2 focus-within:outline-primary"
        >
          <Camera className="size-4" aria-hidden /> {current ? `Cambia ${label}` : `Carica ${label}`}
          <input
            id={name}
            name={name}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        <p className="text-caption text-ink-2">PNG, JPG o WebP, massimo 2 MB. Meglio quadrata.</p>
      </div>
    </div>
  );
}

/** Modifica profilo: persona (nome, cognome, foto), azienda (logo, dati fiscali, sede, presentazione, contatti) e dati della scheda pubblica. */
export function ProfileForm({ values, canEditFiscal }: { values: ProfileValues; canEditFiscal: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfile, {});
  const fullName = `${values.firstName} ${values.lastName}`.trim();

  return (
    <form onSubmit={(e) => {
        // Invio manuale: con action={...} React svuota il modulo anche quando il server risponde con un errore.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }} className="flex flex-col gap-6">
      <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        <h2 className="text-h3 font-semibold">Titolare</h2>
        <ImagePicker name="avatar" label="foto profilo" current={values.avatarUrl} alt={fullName || "Foto"} round />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" htmlFor="firstName" required>
            <Input id="firstName" name="firstName" autoComplete="given-name" defaultValue={values.firstName} required maxLength={60} />
          </Field>
          <Field label="Cognome" htmlFor="lastName" required>
            <Input id="lastName" name="lastName" autoComplete="family-name" defaultValue={values.lastName} required maxLength={60} />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        <h2 className="text-h3 font-semibold">Azienda</h2>
        <ImagePicker name="logo" label="logo" current={values.logoUrl} alt={values.displayName} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ragione sociale" htmlFor="businessName" required help={canEditFiscal ? undefined : "La modifica il titolare dell'account"}>
            <Input id="businessName" name="businessName" autoComplete="organization" defaultValue={values.businessName} required maxLength={160} readOnly={!canEditFiscal} />
          </Field>
          <Field label="Partita IVA" htmlFor="vatNumber" required help="11 cifre">
            <Input id="vatNumber" name="vatNumber" inputMode="numeric" defaultValue={values.vatNumber} required maxLength={16} readOnly={!canEditFiscal} />
          </Field>
        </div>
        <Field label="Sede legale" htmlFor="address" required help="Indirizzo completo, visibile nel profilo pubblico">
          <Input id="address" name="address" autoComplete="street-address" defaultValue={values.address} required maxLength={200} placeholder="Via Roma 1, 30172 Venezia (VE)" />
        </Field>
        <Field label="Frase di presentazione" htmlFor="tagline" required>
          <Input id="tagline" name="tagline" defaultValue={values.tagline} maxLength={120} required />
        </Field>
        <Field label="Descrizione" htmlFor="description" required help="Racconta chi sei, cosa fai e dove lavori">
          <Textarea id="description" name="description" defaultValue={values.description} maxLength={2000} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefono" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={values.phone ?? ""} />
          </Field>
          <Field label="Email per gli avvisi" htmlFor="email" help="Qui arrivano le nuove richieste">
            <Input id="email" name="email" type="email" autoComplete="email" defaultValue={values.email ?? ""} />
          </Field>
        </div>
        <label className="flex items-start gap-3 text-body-s">
          <input type="checkbox" name="hideDirectContacts" defaultChecked={values.hideDirectContacts} className="mt-0.5 size-5 accent-primary" />
          <span>
            <span className="font-semibold">Nascondi telefono ed email sulla scheda pubblica</span>
            <span className="block text-ink-2">I clienti ti scrivono solo dal modulo di richiesta, con il numero verificato.</span>
          </span>
        </label>
      </section>

      <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        <h2 className="text-h3 font-semibold">Scheda pubblica</h2>
        <Field label="Specializzazioni" htmlFor="specialties" help="Separate da virgola, fino a 12. Es.: caldaie, bagni, impianti a pavimento">
          <Input id="specialties" name="specialties" defaultValue={values.specialties.join(", ")} maxLength={1000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Anno di fondazione" htmlFor="foundedYear">
            <Input id="foundedYear" name="foundedYear" inputMode="numeric" defaultValue={values.foundedYear ?? ""} maxLength={4} placeholder="2005" />
          </Field>
        </div>
        <Field label="Orari" htmlFor="openingHours" help="Una riga per fascia, es. «Lun–Ven: 8:00–18:00». Vuoto = orari non mostrati">
          <Textarea id="openingHours" name="openingHours" defaultValue={values.openingHours} maxLength={1500} rows={4} placeholder={"Lun–Ven: 8:00–18:00\nSabato: su appuntamento"} />
        </Field>
      </section>

      {state.error && <p className="text-body-s text-error">{state.error}</p>}
      {state.ok && <p className="text-body-s text-brand">{state.ok}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvataggio…" : "Salva il profilo"}
        </Button>
        <Link href="/area-partner/profilo" className="text-body-s font-semibold text-primary underline">
          Torna al profilo
        </Link>
      </div>
    </form>
  );
}
