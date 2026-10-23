/** Opzioni del modulo di richiesta condivise tra interfaccia e validazione lato server. */

export const AGENCY_REQUEST_TYPES = [
  "Voglio comprare casa",
  "Voglio vendere o far valutare un immobile",
  "Voglio affittare o dare in affitto",
  "Informazioni su un immobile del portfolio",
] as const;

export const TIMINGS = ["Il prima possibile", "Entro 1 mese", "Entro 3 mesi", "Sto solo valutando"] as const;

export const CALLBACK_SLOTS = ["8:00 – 12:00", "12:00 – 14:00", "14:00 – 18:00", "18:00 – 20:00", "Qualsiasi orario"] as const;

export const OTHER_REQUEST = "Altro lavoro";
