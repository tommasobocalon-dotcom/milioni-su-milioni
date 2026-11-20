/** Contenuti fissi della Home. */

/** Id della ricerca nella hero: quando esce dallo schermo, la versione compatta entra nella navbar. */
export const HERO_SEARCH_ID = "ricerca-hero";

/**
 * Video della hero (in `public/hero/`, 720p senza audio, ~1-2 MB) con la prima immagine come poster.
 * Sono in cache nel browser per un anno (next.config.ts): un video nuovo va salvato con un nome nuovo.
 */
export type HeroSlide = { video: string; poster: string };

/** Video che scorrono dietro la hero, uno dopo l'altro; con uno solo va in loop. */
export const HERO_SLIDES: HeroSlide[] = [
  { video: "/hero/giardino-720.mp4", poster: "/hero/giardino-720.jpg" },
  { video: "/hero/sala-720-8s.mp4", poster: "/hero/sala-720.jpg" },
  { video: "/hero/cucina-720-8s.mp4", poster: "/hero/cucina-720.jpg" },
];

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
