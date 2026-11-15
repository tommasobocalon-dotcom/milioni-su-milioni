"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { addPortfolioItem, type ActionState } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PROJECT_PHOTOS, projectPhotosError } from "@/lib/domain/extras";
import { PROPERTY_CONTRACTS } from "@/lib/domain/property-contract";

/**
 * Foto ridotte nel browser (lato lungo 1600 px, JPEG): 8 foto stanno nel limite di una richiesta su Vercel.
 * Se il browser non sa leggerla resta com'è e il server dice cosa non va.
 */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
}

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
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} onSubmit={(e) => {
        // Invio manuale: con action={...} React svuota il modulo anche quando il server risponde con un errore.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const files = data.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
        const error = projectPhotosError(files.length);
        setPhotoError(error);
        if (error) return;
        setPreparing(true);
        Promise.all(files.map(shrink))
          .then((small) => {
            data.delete("photos");
            for (const f of small) data.append("photos", f);
            startTransition(() => action(data));
          })
          .finally(() => setPreparing(false));
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
        <Field label="Foto" htmlFor="pf-photos" required help={`Da ${PROJECT_PHOTOS.min} a ${PROJECT_PHOTOS.max} foto, JPG, PNG o WebP`}>
          <Input id="pf-photos" name="photos" type="file" multiple required accept="image/jpeg,image/png,image/webp" className="py-2" />
        </Field>
      </div>
      {isAgency ? (
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Contratto" htmlFor="pf-contract" required>
            <Select id="pf-contract" name="contract" defaultValue="sale" required>
              {PROPERTY_CONTRACTS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prezzo (€)" htmlFor="pf-price" help="Al mese per gli affitti, base d'asta per l'asta">
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
      <Field label="Descrizione" htmlFor="pf-description" required help="Poche righe: cosa avete fatto, materiali, tempi. Massimo 300 caratteri">
        <Textarea id="pf-description" name="description" required minLength={10} maxLength={300} />
      </Field>
      {(photoError ?? state.error) && (
        <p role="alert" className="text-body-s text-error">
          {photoError ?? state.error}
        </p>
      )}
      {state.ok && <p className="text-body-s text-brand">{state.ok}</p>}
      <Button type="submit" disabled={pending || preparing} className="self-start">
        <Plus aria-hidden /> {preparing ? "Preparo le foto…" : pending ? "Salvataggio…" : "Pubblica il lavoro"}
      </Button>
    </form>
  );
}
