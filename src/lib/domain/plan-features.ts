/**
 * Cosa include ogni piano, come nel documento "Costo e funzioni definitive" (4/11/2026).
 * I prezzi stanno nel database (tabella plans); qui solo le righe da mostrare.
 */
export const PLAN_FEATURES: Record<string, string[]> = {
  base: [
    "Richieste dei clienti illimitate e gratis",
    "Profilo con i dati dell'attività",
    "Fino a 5 progetti in bacheca",
    "Un solo comune o zona",
  ],
  normal: [
    "Richieste dei clienti illimitate e gratis",
    "Badge \"Partner Pro\" e scheda con il bordo verde",
    "Sezione Prima e Dopo",
    "Fino a 25 progetti con dettagli tecnici",
    "Copertura provinciale o regionale",
    "Statistiche complete",
    "Logo in Home e boost nella ricerca a pacchetti",
  ],
  premium: [
    "Richieste dei clienti illimitate e gratis",
    "Badge \"Partner Elite\" e scheda con il bordo lilla",
    "Posizione prioritaria nelle ricerche",
    "Portfolio illimitato con foto HD e video",
    "Copertura nazionale",
    "Statistiche avanzate e assistenza dedicata",
    "Logo in Home e boost nella ricerca a pacchetti",
  ],
};

export const planFeatures = (code: string) => PLAN_FEATURES[code] ?? [];
