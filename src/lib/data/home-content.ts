import { CATEGORY_PHOTOS, type CategoryPhoto } from "./category-photos";

/**
 * Contenuti fissi della Home. Le foto vengono da archivi aperti (category-photos.ts, crediti nel footer):
 * mostrano il mestiere o il posto, mai il lavoro di un partner.
 */

/** Id della ricerca nella hero: quando esce dallo schermo, la versione compatta entra nella navbar. */
export const HERO_SEARCH_ID = "ricerca-hero";

export type HeroSlide = { photo: CategoryPhoto; label: string; caption: string; href: string };

const photo = (slug: string) => CATEGORY_PHOTOS[slug];

/** Foto che scorrono dietro la hero, con la didascalia in basso a destra (come le "storie" di Thumbtack). */
export const HERO_SLIDES: HeroSlide[] = [
  { photo: photo("agenzia-immobiliare"), label: "Trova casa", caption: "Case affacciate su un canale a Treviso", href: "/trova-casa" },
  { photo: photo("ristrutturazioni"), label: "Ristrutturazioni", caption: "Muri in mattoni, posati a mano", href: "/trova-professionista?categoria=ristrutturazioni" },
  { photo: photo("architetto"), label: "Architetti", caption: "Piante e prospetti di una casa", href: "/trova-professionista?categoria=architetto" },
  { photo: photo("geometra"), label: "Geometri", caption: "Rilievo con la stazione totale", href: "/trova-professionista?categoria=geometra" },
];

/** Tutte le foto usate in Home, per i crediti del footer. */
export const HOME_PHOTOS: CategoryPhoto[] = HERO_SLIDES.map((s) => s.photo);

/** Le sette province con uno slogan breve e il capoluogo da cercare. Chiave: sigla. */
export const PROVINCE_BLOCKS: { code: string; name: string; slogan: string; city: string }[] = [
  { code: "VE", name: "Venezia", slogan: "Dalla laguna all'entroterra", city: "Venezia" },
  { code: "PD", name: "Padova", slogan: "Tra i Colli Euganei e il Brenta", city: "Padova" },
  { code: "TV", name: "Treviso", slogan: "La Marca, tra Sile e Piave", city: "Treviso" },
  { code: "VR", name: "Verona", slogan: "Dal Garda alla Lessinia", city: "Verona" },
  { code: "VI", name: "Vicenza", slogan: "Ville palladiane e Altopiano", city: "Vicenza" },
  { code: "BL", name: "Belluno", slogan: "Ai piedi delle Dolomiti", city: "Belluno" },
  { code: "RO", name: "Rovigo", slogan: "Il Polesine, tra Adige e Po", city: "Rovigo" },
];
