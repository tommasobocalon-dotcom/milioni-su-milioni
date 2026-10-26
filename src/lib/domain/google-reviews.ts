/**
 * Recensioni Google (Places API "New"). Google ne restituisce al massimo 5, le "più pertinenti".
 * Regole di Google: si salva solo il place ID, le recensioni si leggono dall'API; ogni recensione
 * mostra autore (nome, foto, link) e rimanda a Google Maps; la sezione porta l'attribuzione "Google Maps".
 */

export type GoogleReview = {
  id: string;
  rating: number;
  text: string;
  /** Data relativa già localizzata da Google ("2 mesi fa"). */
  when: string;
  author: { name: string; uri?: string; photoUri?: string };
  mapsUri?: string;
};

export type GooglePlaceReviews = { rating: number; count: number; mapsUri?: string; reviews: GoogleReview[] };

export type GooglePlaceMatch = { id: string; name: string; address: string; rating?: number; count?: number };

type LocalizedText = { text?: string } | undefined;
type ApiReview = {
  name?: string;
  rating?: number;
  text?: LocalizedText;
  originalText?: LocalizedText;
  relativePublishTimeDescription?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  googleMapsUri?: string;
};
type ApiPlace = { rating?: number; userRatingCount?: number; googleMapsUri?: string; reviews?: ApiReview[] };

/** Solo link https: i dati arrivano da terzi e finiscono in href e src. */
const https = (u: string | undefined) => (u && /^https:\/\//.test(u) ? u : undefined);

export function parseGooglePlaceReviews(place: ApiPlace | null | undefined): GooglePlaceReviews | null {
  if (!place?.rating || !place.userRatingCount) return null;
  const reviews = (place.reviews ?? []).flatMap((r): GoogleReview[] => {
    const text = (r.text?.text || r.originalText?.text || "").trim();
    if (!text || !r.name || !r.rating) return [];
    return [
      {
        id: r.name,
        rating: r.rating,
        text,
        when: r.relativePublishTimeDescription ?? "",
        author: {
          name: r.authorAttribution?.displayName?.trim() || "Utente Google",
          uri: https(r.authorAttribution?.uri),
          photoUri: https(r.authorAttribution?.photoUri),
        },
        mapsUri: https(r.googleMapsUri),
      },
    ];
  });
  return { rating: place.rating, count: place.userRatingCount, mapsUri: https(place.googleMapsUri), reviews: reviews.slice(0, 5) };
}

type ApiSearch = {
  places?: { id?: string; displayName?: LocalizedText; formattedAddress?: string; rating?: number; userRatingCount?: number }[];
};

export function parseGooglePlaceSearch(res: ApiSearch | null | undefined): GooglePlaceMatch[] {
  return (res?.places ?? []).flatMap((p) =>
    p.id ? [{ id: p.id, name: p.displayName?.text ?? "", address: p.formattedAddress ?? "", rating: p.rating, count: p.userRatingCount }] : [],
  );
}
