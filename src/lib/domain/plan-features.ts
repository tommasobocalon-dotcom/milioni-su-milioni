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
    "Pacchetti di visibilità non disponibili",
  ],
  normal: [
    "Richieste dei clienti illimitate e gratis",
    "Badge \"Normal\" e scheda con il bordo verde",
    "Sezione Prima e Dopo",
    "Fino a 25 progetti con dettagli tecnici",
    "Altri comuni a scelta, 49 € + IVA a comune ogni 30 giorni",
    "Statistiche di visite e richieste",
    "Pacchetti di visibilità: boost nella ricerca e logo in Home",
  ],
  premium: [
    "Richieste dei clienti illimitate e gratis",
    "Badge \"Premium\" e scheda color lavanda",
    "Posizione prioritaria nelle ricerche",
    "Portfolio illimitato con foto HD e video",
    "Altri comuni a scelta, 49 € + IVA a comune ogni 30 giorni",
    "Statistiche di visite e richieste, assistenza dedicata",
    "Pacchetti di visibilità: boost nella ricerca e logo in Home",
  ],
};

export const planFeatures = (code: string) => PLAN_FEATURES[code] ?? [];
