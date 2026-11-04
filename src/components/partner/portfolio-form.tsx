"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { addPortfolioItem, type ActionState } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

/** Nuovo elemento del portfolio: immobile per le agenzie, lavoro svolto per gli altri. */
export function PortfolioForm({
  isAgency,
  places,
  canVideo,
  limitNote,
}: {
  isAgency: boolean;
  places: { id: number; label: string }[];
  /** Video YouTube o Vimeo: solo piano Premium. */
  canVideo: boolean;
  /** Es. "3 di 5 progetti del piano Base". */
  limitNote: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addPortfolioItem, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} onSubmit={(e) => {
        // Invio manuale: con action={...} React svuota il modulo anche quando il server risponde con un errore.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-h3 font-semibold">{isAgency ? "Aggiungi un immobile" : "Aggiungi un lavoro"}</h2>
        {limitNote && <p className="text-body-s text-ink-2">{limitNote}</p>}
      </div>
      <Field label="Titolo" htmlFor="pf-title" required>
        <Input id="pf-title" name="title" required maxLength={120} placeholder={isAgency ? "Trilocale con terrazzo" : "Rifacimento bagno completo"} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Comune" htmlFor="pf-place">
          <Select id="pf-place" name="municipalityId" defaultValue="">
            <option value="">—</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Foto" htmlFor="pf-image" help="JPG, PNG o WebP, massimo 2 MB">
          <Input id="pf-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="py-2" />
        </Field>
      </div>
      {isAgency ? (
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Contratto" htmlFor="pf-contract" required>
            <Select id="pf-contract" name="contract" defaultValue="sale" required>
              <option value="sale">Vendita</option>
              <option value="rent">Affitto</option>
            </Select>
          </Field>
          <Field label="Prezzo (€)" htmlFor="pf-price" help="Al mese per l'affitto">
            <Input id="pf-price" name="priceEuro" type="number" min={0} inputMode="numeric" />
          </Field>
          <Field label="Metri quadri" htmlFor="pf-sqm">
            <Input id="pf-sqm" name="sqm" type="number" min={0} inputMode="numeric" />
          </Field>
          <Field label="Locali" htmlFor="pf-rooms">
            <Input id="pf-rooms" name="rooms" type="number" min={0} inputMode="numeric" />
          </Field>
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 text-body-s">
          <input type="checkbox" name="hasBeforeAfter" className="size-4" /> Ho le foto prima e dopo
        </label>
      )}
      {canVideo && (
        <Field label="Video" htmlFor="pf-video" help="Link di YouTube o Vimeo (incluso nel piano Premium)">
          <Input id="pf-video" name="videoUrl" type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…" />
        </Field>
      )}
      <Field label="Descrizione" htmlFor="pf-description">
        <Textarea id="pf-description" name="description" maxLength={1000} />
      </Field>
      {state.error && <p className="text-body-s text-error">{state.error}</p>}
      {state.ok && <p className="text-body-s text-brand">{state.ok}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        <Plus aria-hidden /> {pending ? "Salvataggio…" : "Aggiungi"}
      </Button>
    </form>
  );
}
