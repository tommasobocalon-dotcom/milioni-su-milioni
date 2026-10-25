/**
 * Foto delle categorie in Home, da archivi aperti (scaricate con assets.mjs della taste-skill, fonti in
 * public/foto/categorie/credits.json). Mostrano il mestiere, non i partner: il credito è sotto la sezione.
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
  "consulente-mutui": {
    src: "/foto/categorie/consulenti-mutui.jpg",
    alt: "Chiave di casa in ottone",
    credit: { title: "House key", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", page: "https://commons.wikimedia.org/w/index.php?curid=691559" },
  },
};
