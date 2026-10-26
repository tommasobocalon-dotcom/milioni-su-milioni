import { ExternalLink } from "lucide-react";
import { Stars } from "@/components/ui/stars";
import { formatRating } from "@/lib/domain/format";
import { getGoogleReviews } from "@/lib/google/places";

/**
 * Recensioni della scheda Google Maps del partner. Va dentro <Suspense>: chiama Google (con cache).
 * Attribuzione come da regole Google: "Google Maps" non tradotto, autore con foto e link, link a ogni recensione.
 */
export async function GoogleReviewsSection({ placeId }: { placeId: string }) {
  const g = await getGoogleReviews(placeId);
  if (!g) return null;
  return (
    <section id="recensioni-google" aria-labelledby="recensioni-google-titolo" className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="recensioni-google-titolo" className="font-display text-h2">
            Recensioni su Google
          </h2>
          {/* Attribuzione obbligatoria: testo esatto, in Roboto, non tradotto. */}
          <p className="text-caption text-ink-2" style={{ fontFamily: "Roboto, Arial, sans-serif" }} translate="no">
            Google Maps
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-display text-display-l">
            {formatRating(g.rating)}
            <span className="sr-only"> su 5</span>
          </span>
          <div className="flex flex-col gap-1">
            <Stars value={g.rating} />
            <span className="text-caption text-ink-2">{g.count.toLocaleString("it-IT")} recensioni su Google</span>
          </div>
        </div>
      </div>

      {g.reviews.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {g.reviews.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 py-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-s">
                <AuthorLink uri={r.author.uri} className="flex items-center gap-2 font-semibold">
                  {r.author.photoUri ? (
                    // Foto dell'autore servita da Google: niente ottimizzazione di next/image su un host esterno.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.author.photoUri} alt="" width={28} height={28} className="size-7 rounded-full" referrerPolicy="no-referrer" loading="lazy" />
                  ) : (
                    <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-subtle text-caption font-semibold">
                      {r.author.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {r.author.name}
                </AuthorLink>
                <Stars value={r.rating} size={14} />
                <span className="sr-only">{r.rating} stelle su 5</span>
                {r.when && <span className="text-ink-2">{r.when}</span>}
              </div>
              <p className="text-body whitespace-pre-line">{r.text}</p>
              {r.mapsUri && (
                <a href={r.mapsUri} target="_blank" rel="noopener noreferrer" className="self-start text-caption font-semibold text-primary underline">
                  Leggi su Google Maps
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-caption text-ink-2">
        Recensioni scritte su Google: geco non le modifica e non le verifica. Google ne mostra qui al massimo cinque.{" "}
        {g.mapsUri && (
          <a href={g.mapsUri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline">
            Tutte le recensioni su Google Maps <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </p>
    </section>
  );
}

function AuthorLink({ uri, className, children }: { uri?: string; className: string; children: React.ReactNode }) {
  if (!uri) return <span className={className}>{children}</span>;
  return (
    <a href={uri} target="_blank" rel="noopener noreferrer" className={`${className} hover:underline`}>
      {children}
    </a>
  );
}
