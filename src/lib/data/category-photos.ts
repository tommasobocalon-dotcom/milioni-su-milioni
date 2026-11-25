/**
 * Foto delle categorie in Home, da archivi aperti (scaricate con assets.mjs della taste-skill, fonti in
 * public/foto/categorie/credits.json). Mostrano il mestiere, non i partner: i crediti sono in fondo alla pagina Termini (MediaCredits).
 */
export type CategoryPhoto = {
  src: string;
  alt: string;
  credit: { title: string; author?: string; license: string; licenseUrl: string; page: string };
};

export const CATEGORY_PHOTOS: Record<string, CategoryPhoto> = {
  "agenzia-immobiliare": {
    src: "/foto/categorie/agenzie-immobiliari.jpg",
    alt: "Case colorate affacciate su un canale a Treviso",
    credit: { title: "Treviso", author: "Christine und Hagen Graf", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", page: "https://www.flickr.com/photos/17963290@N00/2109875291" },
  },
  idraulico: {
    src: "/foto/categorie/idraulici.webp",
    alt: "Tubi in rame con valvole rosse",
    credit: { title: "Water valve", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", page: "https://www.rawpixel.com/image/6041215/water-valve-free-public-domain-cc0-photo" },
  },
  elettricista: {
    src: "/foto/categorie/elettricisti.jpg",
    alt: "Elettricista al lavoro con cavi e attrezzi sul pavimento",
    credit: { title: "Electrician Working", author: "editor B", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0", page: "https://commons.wikimedia.org/wiki/File:Electrician_Working.jpg" },
  },
  geometra: {
    src: "/foto/categorie/geometri.jpg",
    alt: "Geometra che misura con la stazione totale su treppiede",
    credit: { title: "Land Surveyor", author: "Random Guy of the Century", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", page: "https://commons.wikimedia.org/wiki/File:Land_Surveyor.jpg" },
  },
  architetto: {
    src: "/foto/categorie/architetti.jpg",
    alt: "Tavole di progetto con piante e prospetti di una casa",
    credit: { title: "Regionarkivet i Östergötland 20151114 16", author: "LA2", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", page: "https://commons.wikimedia.org/w/index.php?curid=45064770" },
  },
  imbianchino: {
    src: "/foto/categorie/imbianchini.jpg",
    alt: "Imbianchino in salopette che dipinge una parete gialla",
    credit: { title: "Guy Man", author: "Michal Jarmoluk", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", page: "https://stocksnap.io/photo/guy-man-Q67DPDQSC1" },
  },
  ristrutturazioni: {
    src: "/foto/categorie/ristrutturazioni.jpg",
    alt: "Muratore che posa mattoni con la cazzuola",
    credit: { title: "Bricklayer J5", author: "Jamain", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", page: "https://commons.wikimedia.org/w/index.php?curid=30586926" },
  },
};

/** Foto della pagina Chi siamo, da Pexels (fonti in public/foto/chi-siamo/credits.json), creditate nel footer. */
export const ABOUT_PHOTOS = {
  hero: {
    src: "/foto/chi-siamo/apertura.jpg",
    alt: "Agente immobiliare sorridente accanto a una famiglia abbracciata davanti alla porta della nuova casa",
    credit: { title: "Famiglia con l'agente immobiliare davanti alla nuova casa", author: "MART PRODUCTION", license: "Licenza Pexels", licenseUrl: "https://www.pexels.com/it-it/license/", page: "https://www.pexels.com/it-it/foto/uomo-persone-donne-casa-7415046/" },
  },
  why: {
    src: "/foto/chi-siamo/perche.jpg",
    alt: "Coppia che esamina la planimetria della casa da ristrutturare",
    credit: { title: "Coppia che discute di planimetrie", author: "Tima Miroshnichenko", license: "Licenza Pexels", licenseUrl: "https://www.pexels.com/it-it/license/", page: "https://www.pexels.com/it-it/foto/uomo-coppia-donna-costruzione-6474498/" },
  },
  businesses: {
    src: "/foto/chi-siamo/imprese-territorio.jpg",
    alt: "Agente immobiliare con una giovane coppia, tutti con il casco, in un appartamento in ristrutturazione",
    credit: { title: "Agente immobiliare e giovane coppia con i caschi", author: "Pavel Danilyuk", license: "Licenza Pexels", licenseUrl: "https://www.pexels.com/it-it/license/", page: "https://www.pexels.com/it-it/foto/abito-completo-coppia-persone-7937366/" },
  },
  profile: {
    src: "/foto/chi-siamo/scheda-impresa.jpg",
    alt: "Professionista che mostra a un cliente il progetto di una casa sul computer",
    credit: { title: "Progetto 3D di una casa al computer", author: "Grove Brands", license: "Licenza Pexels", licenseUrl: "https://www.pexels.com/it-it/license/", page: "https://www.pexels.com/it-it/foto/case-edificio-laptop-uomini-15764095/" },
  },
  contact: {
    src: "/foto/chi-siamo/primo-contatto.jpg",
    alt: "Donna al telefono nella cucina di casa, davanti al computer",
    credit: { title: "Donna che lavora da remoto nella cucina di casa", author: "Vitaly Gariev", license: "Licenza Pexels", licenseUrl: "https://www.pexels.com/it-it/license/", page: "https://www.pexels.com/it-it/foto/donna-che-lavora-da-remoto-nella-cucina-di-casa-36697452/" },
  },
} satisfies Record<string, CategoryPhoto>;

const PEXELS = { license: "Licenza Pexels", licenseUrl: "https://www.pexels.com/it-it/license/" };

/** Foto della pagina Come funziona, da Pexels (fonti in public/foto/come-funziona/credits.json), creditate nel footer. */
export const HOW_PHOTOS = {
  hero: {
    src: "/foto/come-funziona/verona.jpg",
    alt: "Case colorate affacciate sull'Adige a Verona, con il campanile sullo sfondo",
    credit: { title: "Case colorate sull'Adige a Verona", author: "Merve Türk", ...PEXELS, page: "https://www.pexels.com/it-it/foto/19158705/" },
  },
  search: {
    src: "/foto/come-funziona/cerca-telefono.jpg",
    alt: "Coppia sorridente sul divano che guarda insieme il telefono",
    credit: { title: "Coppia che cerca dal telefono sul divano", author: "Vitaly Gariev", ...PEXELS, page: "https://www.pexels.com/it-it/foto/36813080/" },
  },
  compare: {
    src: "/foto/come-funziona/confronta-portatile.jpg",
    alt: "Coppia seduta sul divano che guarda insieme il portatile",
    credit: { title: "Coppia che confronta dal portatile sul divano", author: "Mikhail Nilov", ...PEXELS, page: "https://www.pexels.com/it-it/foto/6894025/" },
  },
  request: {
    src: "/foto/come-funziona/richiedi-telefono.jpg",
    alt: "Ragazza sorridente al telefono, seduta sul divano di casa",
    credit: { title: "Ragazza al telefono sul divano di casa", author: "Antoni Shkraba", ...PEXELS, page: "https://www.pexels.com/it-it/foto/7579177/" },
  },
  done: {
    src: "/foto/come-funziona/lavoro-elettricista.jpg",
    alt: "Elettricista con il casco che fora la parete per montare una presa",
    credit: { title: "Elettricista che monta una presa in un appartamento", author: "Antoni Shkraba", ...PEXELS, page: "https://www.pexels.com/it-it/foto/4981802/" },
  },
  newHome: {
    src: "/foto/come-funziona/chiavi-casa.jpg",
    alt: "Coppia distesa sul pavimento tra gli scatoloni con in mano le chiavi della casa nuova",
    credit: { title: "Coppia con le chiavi della casa nuova tra gli scatoloni", author: "Vitaly Gariev", ...PEXELS, page: "https://www.pexels.com/it-it/foto/36729696/" },
  },
} satisfies Record<string, CategoryPhoto>;
