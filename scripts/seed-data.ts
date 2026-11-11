/**
 * Dati di esempio per sviluppo e demo, coerenti con le schermate Figma.
 * Nomi di aziende e persone sono inventati. Tutti i 560 comuni del Veneto arrivano dalla migrazione
 * 0018_comuni_veneto (elenco ISTAT); qui restano quelli usati dagli esempi, con coordinate e frazioni scritte a mano.
 */

export const REGIONS = [{ id: 5, name: "Veneto", slug: "veneto", active: true }];

export const PROVINCES = [
  { id: 23, code: "VR", name: "Verona", slug: "verona" },
  { id: 24, code: "VI", name: "Vicenza", slug: "vicenza" },
  { id: 25, code: "BL", name: "Belluno", slug: "belluno" },
  { id: 26, code: "TV", name: "Treviso", slug: "treviso" },
  { id: 27, code: "VE", name: "Venezia", slug: "venezia" },
  { id: 28, code: "PD", name: "Padova", slug: "padova" },
  { id: 29, code: "RO", name: "Rovigo", slug: "rovigo" },
];

export const MUNICIPALITIES = [
  { id: 28060, provinceId: 28, name: "Padova", lat: 45.4064, lng: 11.8768, aliases: [] },
  { id: 28001, provinceId: 28, name: "Abano Terme", lat: 45.36, lng: 11.79, aliases: [] },
  { id: 28003, provinceId: 28, name: "Albignasego", lat: 45.347, lng: 11.859, aliases: [] },
  { id: 28016, provinceId: 28, name: "Cadoneghe", lat: 45.44, lng: 11.928, aliases: [] },
  { id: 28058, provinceId: 28, name: "Noventa Padovana", lat: 45.415, lng: 11.953, aliases: [] },
  { id: 28072, provinceId: 28, name: "Rubano", lat: 45.427, lng: 11.788, aliases: [] },
  { id: 28086, provinceId: 28, name: "Selvazzano Dentro", lat: 45.395, lng: 11.786, aliases: ["Selvazzano"] },
  { id: 28100, provinceId: 28, name: "Vigonza", lat: 45.443, lng: 11.985, aliases: [] },
  { id: 27042, provinceId: 27, name: "Venezia", lat: 45.4408, lng: 12.3155, aliases: ["Mestre", "Marghera", "Lido di Venezia", "Venezia-Mestre"] },
  { id: 27008, provinceId: 27, name: "Chioggia", lat: 45.219, lng: 12.279, aliases: ["Sottomarina"] },
  { id: 27024, provinceId: 27, name: "Mirano", lat: 45.493, lng: 12.108, aliases: [] },
  { id: 27026, provinceId: 27, name: "Noale", lat: 45.55, lng: 12.071, aliases: [] },
  { id: 26086, provinceId: 26, name: "Treviso", lat: 45.6669, lng: 12.243, aliases: [] },
  { id: 26043, provinceId: 26, name: "Mogliano Veneto", lat: 45.562, lng: 12.237, aliases: ["Mogliano"] },
  { id: 26012, provinceId: 26, name: "Castelfranco Veneto", lat: 45.671, lng: 11.927, aliases: ["Castelfranco"] },
  { id: 24116, provinceId: 24, name: "Vicenza", lat: 45.5455, lng: 11.5354, aliases: [] },
  { id: 23091, provinceId: 23, name: "Verona", lat: 45.4384, lng: 10.9916, aliases: [] },
  { id: 29041, provinceId: 29, name: "Rovigo", lat: 45.07, lng: 11.79, aliases: [] },
  { id: 25006, provinceId: 25, name: "Belluno", lat: 46.1425, lng: 12.2167, aliases: [] },
];

type Unit = "flat" | "sqm" | "hour" | "visit" | "percent" | "month" | "unit";

export const CATEGORIES: {
  slug: string;
  partnerType: "agency" | "technician" | "artisan" | "b2b";
  name: string;
  pluralName: string;
  icon: string;
  services: [slug: string, name: string, unit: Unit][];
}[] = [
  {
    slug: "agenzia-immobiliare",
    partnerType: "agency",
    name: "Agenzia immobiliare",
    pluralName: "Agenzie immobiliari",
    icon: "building",
    services: [
      ["compravendita", "Compravendita", "percent"],
      ["valutazione", "Valutazione immobile", "flat"],
      ["affitti", "Locazione residenziale", "month"],
      ["foto-planimetria", "Foto professionali e planimetria", "flat"],
    ],
  },
  {
    slug: "idraulico",
    partnerType: "artisan",
    name: "Idraulico",
    pluralName: "Idraulici",
    icon: "droplet",
    services: [
      ["sopralluogo", "Sopralluogo", "flat"],
      ["caldaia", "Sostituzione caldaia a condensazione", "flat"],
      ["bagno", "Rifacimento bagno completo", "flat"],
      ["manutenzione-caldaia", "Manutenzione caldaia annuale", "visit"],
      ["climatizzazione", "Installazione climatizzatore", "unit"],
      ["perdite", "Perdite e riparazioni", "visit"],
      ["pompa-di-calore", "Pompa di calore", "flat"],
    ],
  },
  {
    slug: "elettricista",
    partnerType: "artisan",
    name: "Elettricista",
    pluralName: "Elettricisti",
    icon: "zap",
    services: [
      ["impianto", "Rifacimento impianto elettrico", "sqm"],
      ["certificazione", "Certificazione di conformità", "flat"],
      ["pronto-intervento", "Pronto intervento", "visit"],
      ["fotovoltaico", "Impianto fotovoltaico", "flat"],
    ],
  },
  {
    slug: "geometra",
    partnerType: "technician",
    name: "Geometra",
    pluralName: "Geometri",
    icon: "ruler",
    services: [
      ["pratiche-catastali", "Pratiche catastali", "flat"],
      ["ape", "Certificato APE", "flat"],
      ["successioni", "Successioni", "flat"],
      ["cila", "CILA e sanatorie", "flat"],
    ],
  },
  {
    slug: "architetto",
    partnerType: "technician",
    name: "Architetto",
    pluralName: "Architetti",
    icon: "ruler",
    services: [
      ["progetto-ristrutturazione", "Progetto di ristrutturazione", "flat"],
      ["interior-design", "Interior design", "sqm"],
      ["direzione-lavori", "Direzione lavori", "percent"],
    ],
  },
  {
    slug: "imbianchino",
    partnerType: "artisan",
    name: "Imbianchino",
    pluralName: "Imbianchini",
    icon: "roller",
    services: [
      ["tinteggiatura", "Tinteggiatura interni", "sqm"],
      ["cappotto", "Cappotto termico", "sqm"],
      ["decorazioni", "Decorazioni e stucchi", "sqm"],
    ],
  },
  {
    slug: "ristrutturazioni",
    partnerType: "artisan",
    name: "Impresa di ristrutturazioni",
    pluralName: "Imprese di ristrutturazioni",
    icon: "wrench",
    services: [
      ["ristrutturazione-completa", "Ristrutturazione completa", "sqm"],
      ["bagno", "Rifacimento bagno", "flat"],
      ["cartongesso", "Posa cartongesso", "sqm"],
    ],
  },
  {
    slug: "consulente-mutui",
    partnerType: "b2b",
    name: "Consulente mutui",
    pluralName: "Consulenti mutui",
    icon: "landmark",
    services: [["consulenza-mutuo", "Consulenza mutuo", "flat"]],
  },
];

/** Domande dinamiche del modulo di richiesta, per categoria (PRD §5.5). */
export const QUESTIONS: Record<
  string,
  { key: string; label: string; type: "text" | "textarea" | "number" | "select"; options?: string[]; required?: boolean; help?: string }[]
> = {
  common: [
    { key: "immobile", label: "Tipo di immobile", type: "select", options: ["Appartamento", "Casa indipendente", "Villetta a schiera", "Ufficio o negozio"], required: true },
    { key: "mq", label: "Metri quadri interessati", type: "number", help: "Anche una stima va bene" },
    { key: "piano", label: "Piano", type: "select", options: ["Piano terra", "1°–3° piano", "4° piano o più", "Più piani"] },
    { key: "budget", label: "Budget indicativo", type: "select", options: ["Fino a 1.000 €", "1.000 – 5.000 €", "5.000 – 15.000 €", "Oltre 15.000 €", "Non so ancora"] },
  ],
  "agenzia-immobiliare": [
    { key: "immobile", label: "Tipo di immobile", type: "select", options: ["Appartamento", "Casa indipendente", "Villetta a schiera", "Terreno", "Ufficio o negozio"], required: true },
    { key: "mq", label: "Metri quadri", type: "number" },
    { key: "locali", label: "Numero di locali", type: "select", options: ["1", "2", "3", "4", "5 o più"] },
    { key: "budget", label: "Prezzo indicativo", type: "select", options: ["Fino a 150.000 €", "150.000 – 300.000 €", "300.000 – 500.000 €", "Oltre 500.000 €", "Da valutare"] },
  ],
  idraulico: [
    { key: "impianto", label: "Che impianto hai oggi?", type: "select", options: ["Caldaia a gas", "Pompa di calore", "Teleriscaldamento", "Non so"] },
  ],
  geometra: [
    { key: "pratica", label: "Hai già documenti dell'immobile?", type: "select", options: ["Sì, planimetria e visura", "Solo alcuni", "No"] },
  ],
  "consulente-mutui": [
    { key: "importo", label: "Importo del mutuo", type: "select", options: ["Fino a 100.000 €", "100.000 – 200.000 €", "200.000 – 300.000 €", "Oltre 300.000 €"], required: true },
  ],
};

/** Annuale = 10 mensilità (2 mesi di sconto, PRD §7.1). Prezzi come nel prototipo Figma, da confermare. */
export const PLANS = [
  { code: "base", name: "Base", monthlyPriceCents: 3900, yearlyPriceCents: 34800, leadsIncluded: 0, visibilityWeight: 1, maxProvinces: 1, maxServices: 5, maxPortfolioItems: 5, maxUsers: 1, renewalTokens: 0, featuredSlots: false },
  { code: "normal", name: "Normal", monthlyPriceCents: 8900, yearlyPriceCents: 82800, leadsIncluded: 0, visibilityWeight: 2, maxProvinces: 7, maxServices: 15, maxPortfolioItems: 25, maxUsers: 2, renewalTokens: 0, featuredSlots: true },
  { code: "premium", name: "Premium", monthlyPriceCents: 19900, yearlyPriceCents: 190800, leadsIncluded: 0, visibilityWeight: 3, maxProvinces: 99, maxServices: null, maxPortfolioItems: null, maxUsers: 5, renewalTokens: 0, featuredSlots: true },
];

/** Prezzo in token di un lead oltre quota (PRD §7.4, da confermare in §20). */
export const TOKEN_COST_PER_LEAD = 8;

type PartnerSeed = {
  slug: string;
  category: string;
  businessName: string;
  displayName: string;
  municipality: number;
  tagline: string;
  description: string;
  specialties: string[];
  foundedYear: number;
  responseMinutes: number;
  plan: "base" | "normal" | "premium";
  /** Province servite (sigle) e comuni extra. */
  areas: { provinces?: string[]; municipalities?: number[] };
  prices: [service: string, from: number | null, to: number | null, notes?: string][];
  portfolio: { title: string; municipality?: number; beforeAfter?: boolean; contract?: "sale" | "rent"; priceCents?: number; sqm?: number; rooms?: number }[];
  boosted?: boolean;
  hours?: { label: string; value: string }[];
};

const H_ART = [
  { label: "Lun – Ven", value: "8:00 – 18:00" },
  { label: "Sabato", value: "8:30 – 12:30" },
  { label: "Urgenze", value: "Su richiesta" },
];
const H_AG = [
  { label: "Lun – Ven", value: "9:00 – 19:00" },
  { label: "Sabato", value: "9:00 – 13:00" },
  { label: "Visite", value: "Anche su appuntamento" },
];
const H_STUDIO = [
  { label: "Lun – Ven", value: "9:00 – 13:00, 14:30 – 18:30" },
  { label: "Sabato", value: "Chiuso" },
];

export const PARTNERS: PartnerSeed[] = [
  {
    slug: "rossi-impianti",
    category: "idraulico",
    businessName: "Rossi Impianti S.n.c.",
    displayName: "Rossi Impianti",
    municipality: 28060,
    tagline: "Caldaie, climatizzazione e rifacimento bagni",
    description:
      "Impresa artigiana a conduzione familiare, attiva a Padova e provincia dal 2009. Ci occupiamo di installazione e manutenzione caldaie a condensazione, climatizzatori e rifacimento completo di bagni, con sopralluogo gratuito entro 48 ore.",
    specialties: ["Caldaie a condensazione", "Climatizzazione", "Rifacimento bagno", "Perdite e riparazioni", "Pompe di calore", "Pratiche detrazioni"],
    foundedYear: 2009,
    responseMinutes: 110,
    plan: "normal",
    areas: { provinces: ["PD"] },
    prices: [
      ["sopralluogo", 0, 0, "Entro 48 ore"],
      ["caldaia", 120000, 240000, "Smaltimento incluso, esclusa pratica ENEA"],
      ["bagno", 650000, 1200000, "Fino a 6 m², sanitari esclusi"],
      ["manutenzione-caldaia", 9000, 13000, "Con bollino blu"],
      ["climatizzazione", 65000, 90000, "Dual split +350 €"],
    ],
    portfolio: [
      { title: "Bagno in stile naturale", municipality: 28001, beforeAfter: true },
      { title: "Caldaia a condensazione", municipality: 28060 },
      { title: "Climatizzazione trilocale", municipality: 28100 },
      { title: "Pompa di calore in villetta", municipality: 27026, beforeAfter: true },
    ],
    hours: H_ART,
  },
  {
    slug: "termoidraulica-brenta",
    category: "idraulico",
    businessName: "Termoidraulica Brenta S.r.l.",
    displayName: "Termoidraulica Brenta",
    municipality: 28100,
    tagline: "Impianti e caldaie, pronto intervento in giornata",
    description:
      "Squadra di sei tecnici specializzati in impianti termici e idraulici per case e condomini della provincia di Padova e della Riviera del Brenta. Interveniamo in giornata sulle urgenze.",
    specialties: ["Caldaie", "Impianti a pavimento", "Pronto intervento", "Condomini"],
    foundedYear: 2001,
    responseMinutes: 55,
    plan: "premium",
    areas: { provinces: ["PD", "VE"] },
    prices: [
      ["sopralluogo", 5000, null, "Scalato dal preventivo"],
      ["caldaia", 140000, 260000],
      ["perdite", 8000, 15000, "Uscita e prima ora"],
    ],
    portfolio: [
      { title: "Centrale termica condominio", municipality: 28060 },
      { title: "Riscaldamento a pavimento", municipality: 27024, beforeAfter: true },
    ],
    boosted: true,
    hours: H_ART,
  },
  {
    slug: "bianchi-idrotermica",
    category: "idraulico",
    businessName: "Bianchi Idrotermica di Bianchi Luca",
    displayName: "Bianchi Idrotermica",
    municipality: 28001,
    tagline: "Idraulica e bagni chiavi in mano",
    description: "Artigiano idraulico ad Abano Terme: bagni chiavi in mano, sostituzione sanitari e piccole riparazioni in tutta la zona termale.",
    specialties: ["Bagni chiavi in mano", "Sanitari", "Riparazioni"],
    foundedYear: 2014,
    responseMinutes: 180,
    plan: "base",
    areas: { municipalities: [28001, 28086, 28060, 28003] },
    prices: [
      ["bagno", 580000, 950000, "Fino a 5 m²"],
      ["perdite", 6000, 12000],
    ],
    portfolio: [{ title: "Bagno di servizio", municipality: 28086, beforeAfter: true }],
    hours: H_ART,
  },
  {
    slug: "euganea-manutenzioni",
    category: "idraulico",
    businessName: "Euganea Manutenzioni S.r.l.",
    displayName: "Euganea Manutenzioni",
    municipality: 28086,
    tagline: "Manutenzione caldaie e climatizzatori",
    description: "Centro assistenza autorizzato per caldaie e climatizzatori dei principali marchi. Contratti di manutenzione annuale con bollino blu.",
    specialties: ["Manutenzione caldaie", "Climatizzatori", "Bollino blu"],
    foundedYear: 2006,
    responseMinutes: 240,
    plan: "normal",
    areas: { provinces: ["PD"] },
    prices: [
      ["manutenzione-caldaia", 8500, 11000, "Bollino blu incluso"],
      ["climatizzazione", 59000, 85000],
    ],
    portfolio: [{ title: "Sostituzione climatizzatori ufficio", municipality: 28072 }],
    hours: H_ART,
  },
  {
    slug: "idraulica-lagunare",
    category: "idraulico",
    businessName: "Idraulica Lagunare S.n.c.",
    displayName: "Idraulica Lagunare",
    municipality: 27042,
    tagline: "Idraulici a Venezia, Mestre e Lido",
    description: "Lavoriamo in centro storico e in terraferma: bagni, caldaie e impianti anche in edifici vincolati, con barca attrezzata per il centro storico.",
    specialties: ["Centro storico", "Bagni", "Caldaie", "Edifici vincolati"],
    foundedYear: 1998,
    responseMinutes: 150,
    plan: "premium",
    areas: { provinces: ["VE"] },
    prices: [
      ["sopralluogo", 0, 0, "Mestre e terraferma"],
      ["bagno", 750000, 1400000, "Centro storico +15%"],
      ["caldaia", 150000, 280000],
    ],
    portfolio: [
      { title: "Bagno in palazzo storico", municipality: 27042, beforeAfter: true },
      { title: "Caldaia a Mestre", municipality: 27042 },
    ],
    hours: H_ART,
    boosted: true,
  },
  {
    slug: "studio-tecnico-bianchi",
    category: "geometra",
    businessName: "Studio Tecnico Bianchi",
    displayName: "Studio Tecnico Bianchi",
    municipality: 28060,
    tagline: "Catasto, APE e pratiche edilizie",
    description: "Studio di geometri a Padova: pratiche catastali, certificati APE, successioni e CILA. Sopralluogo e preventivo scritto in 3 giorni lavorativi.",
    specialties: ["Pratiche catastali", "APE", "Successioni", "CILA"],
    foundedYear: 1995,
    responseMinutes: 300,
    plan: "normal",
    areas: { provinces: ["PD"] },
    prices: [
      ["ape", 15000, 25000, "Appartamenti fino a 120 m²"],
      ["pratiche-catastali", 30000, 60000, "Variazione DOCFA"],
      ["successioni", 60000, 120000, "Escluse imposte"],
      ["cila", 80000, 150000],
    ],
    portfolio: [{ title: "Accatastamento villetta", municipality: 28003 }],
    hours: H_STUDIO,
  },
  {
    slug: "geom-gatto",
    category: "geometra",
    businessName: "Studio Tecnico Geom. Gatto",
    displayName: "Studio Tecnico Geom. Gatto",
    municipality: 26086,
    tagline: "Geometra a Treviso",
    description: "Pratiche catastali, APE e assistenza tecnica alle compravendite a Treviso e provincia.",
    specialties: ["APE", "Catasto", "Compravendite"],
    foundedYear: 2011,
    responseMinutes: 420,
    plan: "base",
    areas: { provinces: ["TV"] },
    prices: [
      ["ape", 14000, 22000],
      ["pratiche-catastali", 28000, 50000],
    ],
    portfolio: [],
    hours: H_STUDIO,
  },
  {
    slug: "elettro-bortolin",
    category: "elettricista",
    businessName: "Elettro Bortolin di Bortolin Marco",
    displayName: "Elettro Bortolin",
    municipality: 26086,
    tagline: "Impianti elettrici e fotovoltaico",
    description: "Elettricista a Treviso: rifacimento impianti, certificazioni di conformità e fotovoltaico residenziale con accumulo.",
    specialties: ["Impianti civili", "Fotovoltaico", "Certificazioni"],
    foundedYear: 2008,
    responseMinutes: 200,
    plan: "normal",
    areas: { provinces: ["TV"] },
    prices: [
      ["impianto", 4500, 6500, "Appartamenti, materiale incluso"],
      ["certificazione", 18000, 30000],
      ["fotovoltaico", 650000, 1100000, "Impianto 4,5 kW con accumulo"],
    ],
    portfolio: [{ title: "Fotovoltaico con accumulo", municipality: 26043 }],
    hours: H_ART,
    boosted: true,
  },
  {
    slug: "elettro-zanon",
    category: "elettricista",
    businessName: "Elettro Zanon S.r.l.",
    displayName: "Elettro Zanon",
    municipality: 28003,
    tagline: "Elettricisti a Padova sud",
    description: "Impianti elettrici civili e domotica, pronto intervento su Padova e comuni della cintura sud.",
    specialties: ["Domotica", "Pronto intervento", "Impianti civili"],
    foundedYear: 2016,
    responseMinutes: 95,
    plan: "base",
    areas: { municipalities: [28003, 28060, 28001] },
    prices: [
      ["pronto-intervento", 7000, 12000, "Uscita e prima ora"],
      ["impianto", 5000, 7000],
    ],
    portfolio: [],
    hours: H_ART,
  },
  {
    slug: "pittura-mazzon",
    category: "imbianchino",
    businessName: "Pittura Mazzon",
    displayName: "Pittura Mazzon",
    municipality: 28072,
    tagline: "Tinteggiature, cappotti e decorazioni",
    description: "Imbianchini da tre generazioni: tinteggiatura interni ed esterni, cappotto termico e decorazioni a calce.",
    specialties: ["Interni", "Cappotto termico", "Decorazioni a calce"],
    foundedYear: 1987,
    responseMinutes: 360,
    plan: "normal",
    areas: { provinces: ["PD"] },
    prices: [
      ["tinteggiatura", 700, 1200, "Pareti e soffitti, due mani"],
      ["cappotto", 9000, 13000, "Esclusi ponteggi"],
    ],
    portfolio: [{ title: "Cappotto termico bifamiliare", municipality: 28072, beforeAfter: true }],
    hours: H_ART,
  },
  {
    slug: "edil-brenta",
    category: "ristrutturazioni",
    businessName: "Edil Brenta Ristrutturazioni S.r.l.",
    displayName: "Edil Brenta Ristrutturazioni",
    municipality: 28016,
    tagline: "Ristrutturazioni chiavi in mano",
    description: "Impresa edile per ristrutturazioni complete di appartamenti e case, con un unico referente dal progetto alla consegna.",
    specialties: ["Chiavi in mano", "Bagni", "Cartongesso", "Detrazioni fiscali"],
    foundedYear: 2003,
    responseMinutes: 480,
    plan: "premium",
    areas: { provinces: ["PD", "VE"] },
    prices: [
      ["ristrutturazione-completa", 55000, 90000, "Escluse finiture di pregio"],
      ["cartongesso", 3500, 5500],
    ],
    portfolio: [
      { title: "Trilocale anni '70 rinnovato", municipality: 28016, beforeAfter: true },
      { title: "Open space con cartongesso", municipality: 28060 },
    ],
    hours: H_ART,
    boosted: true,
  },
  {
    slug: "arch-pavan",
    category: "architetto",
    businessName: "Arch. Giulia Pavan",
    displayName: "Arch. Giulia Pavan",
    municipality: 26086,
    tagline: "Progetti di ristrutturazione e interni",
    description: "Architetta a Treviso: progetti di ristrutturazione, interior design e direzione lavori per case e piccoli negozi.",
    specialties: ["Interior design", "Ristrutturazioni", "Direzione lavori"],
    foundedYear: 2012,
    responseMinutes: 600,
    plan: "premium",
    areas: { provinces: ["TV", "VE"] },
    prices: [
      ["progetto-ristrutturazione", 150000, 400000, "Appartamenti fino a 120 m²"],
      ["interior-design", 2500, 4500],
    ],
    portfolio: [{ title: "Casa sul Sile", municipality: 26086 }],
    hours: H_STUDIO,
    boosted: true,
  },
  {
    slug: "immobiliare-prato-della-valle",
    category: "agenzia-immobiliare",
    businessName: "Immobiliare Prato della Valle S.r.l.",
    displayName: "Immobiliare Prato della Valle",
    municipality: 28060,
    tagline: "Vendita, affitto e valutazioni a Padova",
    description:
      "Agenzia indipendente nel cuore di Padova dal 1998. Seguiamo compravendite e affitti residenziali in città e nei comuni della cintura, con valutazione gratuita dell'immobile in 48 ore e assistenza fino al rogito.",
    specialties: ["Compravendita", "Affitti", "Valutazione gratuita", "Nuove costruzioni", "Immobili di pregio"],
    foundedYear: 1998,
    responseMinutes: 115,
    plan: "premium",
    areas: { provinces: ["PD"] },
    prices: [
      ["valutazione", 0, 0, "Relazione scritta entro 48 ore"],
      ["compravendita", 200, 300, "+ IVA, dovuta solo al rogito"],
      ["affitti", null, null, "Una mensilità + IVA"],
      ["foto-planimetria", 0, 0, "Per incarichi in esclusiva"],
    ],
    portfolio: [
      { title: "Trilocale con terrazzo", municipality: 28060, contract: "sale", priceCents: 28500000, sqm: 95, rooms: 3 },
      { title: "Villetta a schiera", municipality: 28001, contract: "sale", priceCents: 34000000, sqm: 160, rooms: 5 },
      { title: "Bilocale arredato", municipality: 28060, contract: "rent", priceCents: 75000, sqm: 55, rooms: 2 },
    ],
    boosted: true,
    hours: H_AG,
  },
  {
    slug: "casa-veneta-immobiliare",
    category: "agenzia-immobiliare",
    businessName: "Casa Veneta Immobiliare S.a.s.",
    displayName: "Casa Veneta Immobiliare",
    municipality: 28060,
    tagline: "Residenziale a Padova e cintura",
    description: "Agenzia specializzata nel residenziale: appartamenti e case in città e nei comuni della cintura nord.",
    specialties: ["Residenziale", "Valutazione gratuita"],
    foundedYear: 2010,
    responseMinutes: 170,
    plan: "normal",
    areas: { provinces: ["PD"] },
    prices: [
      ["valutazione", 0, 0],
      ["compravendita", 250, 300, "+ IVA"],
    ],
    portfolio: [
      { title: "Quadrilocale con giardino", municipality: 28016, contract: "sale", priceCents: 31000000, sqm: 120, rooms: 4 },
      { title: "Monolocale per studenti", municipality: 28060, contract: "rent", priceCents: 55000, sqm: 35, rooms: 1 },
    ],
    hours: H_AG,
  },
  {
    slug: "studio-immobiliare-euganeo",
    category: "agenzia-immobiliare",
    businessName: "Studio Immobiliare Euganeo S.r.l.",
    displayName: "Studio Immobiliare Euganeo",
    municipality: 28001,
    tagline: "Nuove costruzioni ai Colli Euganei",
    description: "Seguiamo la vendita di nuove costruzioni e case ai piedi dei Colli Euganei, in collaborazione con le imprese costruttrici della zona.",
    specialties: ["Nuove costruzioni", "Case indipendenti"],
    foundedYear: 2005,
    responseMinutes: 1300,
    plan: "normal",
    areas: { provinces: ["PD"] },
    prices: [["compravendita", 200, 300, "+ IVA"]],
    portfolio: [{ title: "Villa in classe A", municipality: 28001, contract: "sale", priceCents: 52000000, sqm: 210, rooms: 6 }],
    hours: H_AG,
  },
  {
    slug: "gruppo-casa-padova",
    category: "agenzia-immobiliare",
    businessName: "Gruppo Casa Padova S.r.l.",
    displayName: "Gruppo Casa Padova",
    municipality: 28060,
    tagline: "Affitti e immobili commerciali",
    description: "Gestione affitti residenziali e commerciali, con contratti, registrazione e assistenza durante la locazione.",
    specialties: ["Gestione affitti", "Commerciale"],
    foundedYear: 2000,
    responseMinutes: 230,
    plan: "base",
    areas: { provinces: ["PD"] },
    prices: [["affitti", null, null, "Una mensilità + IVA"]],
    portfolio: [{ title: "Negozio su strada", municipality: 28060, contract: "rent", priceCents: 180000, sqm: 80, rooms: 2 }],
    hours: H_AG,
  },
  {
    slug: "immobiliare-canova",
    category: "agenzia-immobiliare",
    businessName: "Immobiliare Canova S.r.l.",
    displayName: "Immobiliare Canova",
    municipality: 26086,
    tagline: "Case e appartamenti a Treviso",
    description: "Agenzia in Piazza dei Signori: compravendite residenziali nel centro storico di Treviso e nei comuni vicini.",
    specialties: ["Centro storico", "Compravendita"],
    foundedYear: 1992,
    responseMinutes: 160,
    plan: "premium",
    areas: { provinces: ["TV"] },
    prices: [
      ["valutazione", 0, 0],
      ["compravendita", 250, 300, "+ IVA"],
    ],
    portfolio: [{ title: "Attico in centro storico", municipality: 26086, contract: "sale", priceCents: 46000000, sqm: 130, rooms: 4 }],
    hours: H_AG,
    boosted: true,
  },
  {
    slug: "mutui-veneto",
    category: "consulente-mutui",
    businessName: "Mutui Veneto Consulting S.r.l.",
    displayName: "Mutui Veneto Consulting",
    municipality: 28060,
    tagline: "Confronto mutui di più banche",
    description: "Mediatori creditizi iscritti OAM: confrontiamo le offerte di più banche e ti seguiamo fino alla firma del mutuo.",
    specialties: ["Mutuo prima casa", "Surroga", "Giovani under 36"],
    foundedYear: 2015,
    responseMinutes: 90,
    plan: "normal",
    areas: { provinces: ["PD", "VE", "TV"] },
    prices: [["consulenza-mutuo", 0, 0, "Primo incontro gratuito"]],
    portfolio: [],
    hours: H_STUDIO,
  },
];

/** Lead di esempio per Rossi Impianti (schermata "Area Partner — Lead"). Ore fa rispetto al seed. */
export const ROSSI_LEADS: {
  name: string;
  phone: string;
  email: string;
  service: string;
  municipality: number;
  summary: string;
  hoursAgo: number;
  status: "new" | "seen" | "contacted" | "quote_sent" | "won" | "lost";
  slot: string;
  timing: string;
  description?: string;
  answers: [string, string][];
}[] = [
  {
    name: "Marco B.", phone: "+393475551218", email: "marco.b@example.com", service: "bagno", municipality: 27042,
    summary: "Rifacimento bagno · 8 m² · entro 3 mesi", hoursAgo: 2, status: "new", slot: "18:00 – 20:00", timing: "Entro 3 mesi",
    description: "Bagno anni '80 da rifare completamente: vorrei sostituire la vasca con una doccia filo pavimento e spostare il lavandino. Possibile un sopralluogo in settimana dopo le 18?",
    answers: [["Tipo di immobile", "Appartamento"], ["Metri quadri interessati", "8"], ["Piano", "1°–3° piano"], ["Budget indicativo", "5.000 – 15.000 €"]],
  },
  {
    name: "Elena S.", phone: "+393401112233", email: "elena.s@example.com", service: "caldaia", municipality: 28060,
    summary: "Sostituzione caldaia · urgente", hoursAgo: 3, status: "new", slot: "8:00 – 12:00", timing: "Il prima possibile",
    answers: [["Tipo di immobile", "Appartamento"], ["Che impianto hai oggi?", "Caldaia a gas"], ["Budget indicativo", "1.000 – 5.000 €"]],
  },
  {
    name: "Luca F.", phone: "+393389998877", email: "luca.f@example.com", service: "climatizzazione", municipality: 28100,
    summary: "Climatizzazione dual split", hoursAgo: 17, status: "new", slot: "Qualsiasi orario", timing: "Entro 1 mese",
    answers: [["Tipo di immobile", "Villetta a schiera"], ["Metri quadri interessati", "90"]],
  },
  {
    name: "Paola R.", phone: "+393332224455", email: "paola.r@example.com", service: "perdite", municipality: 28001,
    summary: "Perdita sottolavello", hoursAgo: 25, status: "seen", slot: "12:00 – 14:00", timing: "Il prima possibile",
    answers: [["Tipo di immobile", "Appartamento"]],
  },
  {
    name: "Sara N.", phone: "+393297776655", email: "sara.n@example.com", service: "pompa-di-calore", municipality: 27026,
    summary: "Pompa di calore · villetta", hoursAgo: 66, status: "contacted", slot: "18:00 – 20:00", timing: "Entro 3 mesi",
    answers: [["Tipo di immobile", "Casa indipendente"], ["Metri quadri interessati", "140"]],
  },
  {
    name: "Davide P.", phone: "+393281234567", email: "davide.p@example.com", service: "manutenzione-caldaia", municipality: 28072,
    summary: "Manutenzione caldaia annuale", hoursAgo: 96, status: "quote_sent", slot: "8:00 – 12:00", timing: "Entro 1 mese",
    answers: [["Tipo di immobile", "Appartamento"], ["Che impianto hai oggi?", "Caldaia a gas"]],
  },
  {
    name: "Giorgio T.", phone: "+393209876543", email: "giorgio.t@example.com", service: "bagno", municipality: 28086,
    summary: "Rifacimento bagno completo", hoursAgo: 150, status: "won", slot: "Qualsiasi orario", timing: "Entro 3 mesi",
    answers: [["Tipo di immobile", "Appartamento"], ["Metri quadri interessati", "6"]],
  },
  {
    name: "Anna V.", phone: "+393471239876", email: "anna.v@example.com", service: "perdite", municipality: 28016,
    summary: "Installazione scaldabagno", hoursAgo: 200, status: "lost", slot: "14:00 – 18:00", timing: "Entro 1 mese",
    answers: [["Tipo di immobile", "Appartamento"]],
  },
];
