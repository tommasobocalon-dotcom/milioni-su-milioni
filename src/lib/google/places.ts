import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { parseGooglePlaceReviews, parseGooglePlaceSearch, type GooglePlaceMatch, type GooglePlaceReviews } from "@/lib/domain/google-reviews";

/**
 * Google Places API (New), con una chiave server-side limitata a questa API (GOOGLE_PLACES_API_KEY).
 * Le recensioni non si salvano nel database (regole di Google): restano solo nella cache del server
 * per qualche ora, così ogni visita alla scheda non è una chiamata a pagamento.
 */
const API = "https://places.googleapis.com/v1";

export const googlePlacesEnabled = () => Boolean(process.env.GOOGLE_PLACES_API_KEY);

async function call(path: string, init: { method?: string; fieldMask: string; body?: object }): Promise<unknown> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": init.fieldMask, "content-type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error("[google] Places API", path, res.status, (await res.text()).slice(0, 300));
    return null;
  }
  return res.json();
}

/** Voto, numero di recensioni e fino a 5 recensioni in italiano. null se Google non ha voti o non risponde. */
export async function getGoogleReviews(placeId: string): Promise<GooglePlaceReviews | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`google-place:${placeId}`);
  if (!/^[\w-]{10,300}$/.test(placeId)) return null;
  try {
    const place = await call(`/places/${placeId}?languageCode=it&regionCode=IT`, { fieldMask: "rating,userRatingCount,googleMapsUri,reviews" });
    return parseGooglePlaceReviews(place as Parameters<typeof parseGooglePlaceReviews>[0]);
  } catch (e) {
    console.error("[google] recensioni non lette:", e);
    return null;
  }
}

/** Ricerca dell'attività su Google per collegarla alla scheda ("Rossi Impianti Mestre"). */
export async function searchGooglePlaces(query: string): Promise<GooglePlaceMatch[]> {
  const res = await call("/places:searchText", {
    method: "POST",
    fieldMask: "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
    body: { textQuery: query, languageCode: "it", regionCode: "IT", pageSize: 5 },
  });
  return parseGooglePlaceSearch(res as Parameters<typeof parseGooglePlaceSearch>[0]);
}
