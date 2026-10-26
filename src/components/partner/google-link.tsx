"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { linkGooglePlace, searchGoogleBusiness } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { GooglePlaceMatch } from "@/lib/domain/google-reviews";
import { formatRating } from "@/lib/domain/format";

/** Ricerca e collegamento della scheda Google Maps del partner (Area Partner → La mia scheda). */
export function GoogleLink({ defaultQuery }: { defaultQuery: string }) {
  const [matches, setMatches] = useState<GooglePlaceMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = String(new FormData(e.currentTarget).get("query") ?? "");
    setError(null);
    start(async () => {
      const res = await searchGoogleBusiness(query);
      if (res.ok) setMatches(res.matches);
      else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Cerca la tua attività su Google" htmlFor="google-query" className="flex-1" error={error ?? undefined}>
          <Input id="google-query" name="query" defaultValue={defaultQuery} aria-invalid={!!error} aria-describedby={error ? "google-query-error" : undefined} />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          <Search aria-hidden /> {pending ? "Ricerca…" : "Cerca"}
        </Button>
      </form>

      {matches && matches.length === 0 && (
        <p role="status" className="text-body-s text-ink-2">
          Nessuna attività trovata. Prova con il nome esatto che usi su Google Maps e il comune.
        </p>
      )}
      {matches && matches.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-md border border-line" aria-label="Attività trovate su Google">
          {matches.map((m) => (
            <li key={m.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col">
                <span className="font-semibold">{m.name}</span>
                <span className="text-body-s text-ink-2">{m.address}</span>
                {m.rating != null && m.count ? (
                  <span className="text-caption text-ink-2">
                    {formatRating(m.rating)} su 5 · {m.count} recensioni
                  </span>
                ) : (
                  <span className="text-caption text-ink-2">Ancora nessuna recensione su Google</span>
                )}
              </div>
              <Button size="s" disabled={pending} onClick={() => start(() => linkGooglePlace(m.id))}>
                È la mia attività
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GoogleUnlinkButton() {
  const [pending, start] = useTransition();
  return (
    <Button size="s" variant="danger" disabled={pending} onClick={() => start(() => linkGooglePlace(null))}>
      {pending ? "Scollegamento…" : "Scollega"}
    </Button>
  );
}
