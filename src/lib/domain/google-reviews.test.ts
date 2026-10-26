import { describe, expect, it } from "vitest";
import { parseGooglePlaceReviews, parseGooglePlaceSearch } from "./google-reviews";

const review = {
  name: "places/abc/reviews/1",
  relativePublishTimeDescription: "2 mesi fa",
  rating: 5,
  text: { text: "Lavoro fatto bene e in fretta.", languageCode: "it" },
  originalText: { text: "Lavoro fatto bene e in fretta.", languageCode: "it" },
  authorAttribution: { displayName: "Luca B.", uri: "https://www.google.com/maps/contrib/1", photoUri: "https://lh3.googleusercontent.com/a/x" },
  publishTime: "2026-08-20T10:00:00Z",
  googleMapsUri: "https://www.google.com/maps/reviews/data=1",
};

describe("recensioni Google: lettura della risposta di Place Details", () => {
  it("prende voto, numero di recensioni, link e fino a 5 recensioni", () => {
    const r = parseGooglePlaceReviews({ rating: 4.7, userRatingCount: 128, googleMapsUri: "https://maps.google.com/?cid=1", reviews: [review] });
    expect(r).toEqual({
      rating: 4.7,
      count: 128,
      mapsUri: "https://maps.google.com/?cid=1",
      reviews: [
        {
          id: "places/abc/reviews/1",
          rating: 5,
          text: "Lavoro fatto bene e in fretta.",
          when: "2 mesi fa",
          author: { name: "Luca B.", uri: "https://www.google.com/maps/contrib/1", photoUri: "https://lh3.googleusercontent.com/a/x" },
          mapsUri: "https://www.google.com/maps/reviews/data=1",
        },
      ],
    });
  });

  it("senza voti su Google non c'è niente da mostrare", () => {
    expect(parseGooglePlaceReviews({ googleMapsUri: "https://maps.google.com/?cid=1" })).toBeNull();
    expect(parseGooglePlaceReviews({ rating: 4, userRatingCount: 0 })).toBeNull();
    expect(parseGooglePlaceReviews(null)).toBeNull();
  });

  it("scarta le recensioni senza testo e accetta solo link https", () => {
    const r = parseGooglePlaceReviews({
      rating: 4,
      userRatingCount: 3,
      reviews: [
        { ...review, text: undefined, originalText: undefined },
        { ...review, name: "places/abc/reviews/2", authorAttribution: { displayName: "Anna", uri: "javascript:alert(1)", photoUri: "http://x" } },
      ],
    });
    expect(r?.reviews).toHaveLength(1);
    expect(r?.reviews[0].author).toEqual({ name: "Anna", uri: undefined, photoUri: undefined });
  });

  it("usa il testo originale se manca quello tradotto", () => {
    const r = parseGooglePlaceReviews({ rating: 5, userRatingCount: 1, reviews: [{ ...review, text: undefined }] });
    expect(r?.reviews[0].text).toBe("Lavoro fatto bene e in fretta.");
  });
});

describe("recensioni Google: risultati della ricerca dell'attività", () => {
  it("restituisce id, nome e indirizzo", () => {
    expect(
      parseGooglePlaceSearch({
        places: [
          { id: "ChIJ1", displayName: { text: "Rossi Impianti" }, formattedAddress: "Via Piave 12, Mestre VE", rating: 4.8, userRatingCount: 40 },
          { id: "", displayName: { text: "Senza id" } },
        ],
      }),
    ).toEqual([{ id: "ChIJ1", name: "Rossi Impianti", address: "Via Piave 12, Mestre VE", rating: 4.8, count: 40 }]);
    expect(parseGooglePlaceSearch({})).toEqual([]);
  });
});
