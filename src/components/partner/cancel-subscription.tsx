"use client";

import { useActionState, useState, useTransition } from "react";
import { cancelSubscription, undoCancellation, type CancelState } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { CANCEL_REASONS } from "@/lib/domain/billing";

/**
 * Disdetta in fondo alla pagina Abbonamento: chiusa finché non la apri, dice prima cosa succede e quando, poi chiede
 * il motivo (facoltativo) e la conferma. Niente offerte per trattenere: "Conferma la disdetta" è sempre a un clic.
 */
export function CancelSubscription({ until, owner }: { until: string; owner: boolean }) {
  const [state, action, pending] = useActionState<CancelState, FormData>(cancelSubscription, {});
  return (
    <details className="rounded-lg border border-line bg-surface p-5 open:flex open:flex-col open:gap-4">
      <summary className="cursor-pointer text-body font-semibold text-ink-2 hover:text-ink">Disdici l&apos;abbonamento</summary>
      <div className="flex flex-col gap-2 text-body-s">
        <p>Se disdici:</p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            fino al <strong>{until}</strong> resta tutto attivo: la scheda è visibile e ricevi le richieste;
          </li>
          <li>da quel giorno la scheda non compare più sul sito e non ti addebitiamo più nulla;</li>
          <li>fino al {until} puoi annullare la disdetta da questa pagina;</li>
          <li>i dati dell&apos;azienda restano salvati: per tornare online basta scegliere di nuovo un piano.</li>
        </ul>
      </div>
      {owner ? (
        <form action={action} className="flex flex-col gap-4">
          <Field label="Perché disdici? (facoltativo)" htmlFor="cancel-reason">
            <Select id="cancel-reason" name="reason" defaultValue="">
              <option value="">Preferisco non dirlo</option>
              {CANCEL_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vuoi dirci altro? (facoltativo)" htmlFor="cancel-note">
            <Textarea id="cancel-note" name="note" maxLength={500} rows={3} />
          </Field>
          {state.error && (
            <p role="alert" className="rounded-md border border-error bg-error-soft px-3.5 py-2.5 text-body-s text-error">
              {state.error}
            </p>
          )}
          <Button type="submit" variant="secondary" disabled={pending} className="self-start">
            {pending ? "Disdetta in corso…" : `Conferma la disdetta dal ${until}`}
          </Button>
        </form>
      ) : (
        <p className="text-caption text-ink-2">Solo il titolare dell&apos;account può disdire l&apos;abbonamento.</p>
      )}
    </details>
  );
}

/** Ripensamento prima della scadenza. */
export function UndoCancellationButton({ owner }: { owner: boolean }) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        className="self-start"
        disabled={pending || !owner}
        onClick={() =>
          start(async () => {
            // Se va a buon fine l'azione fa redirect e non torna qui.
            const res = await undoCancellation();
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Un momento…" : "Annulla la disdetta"}
      </Button>
      {error && (
        <p role="alert" className="text-body-s text-error">
          {error}
        </p>
      )}
      {!owner && <p className="text-caption text-ink-2">Solo il titolare dell&apos;account può annullare la disdetta.</p>}
    </div>
  );
}
