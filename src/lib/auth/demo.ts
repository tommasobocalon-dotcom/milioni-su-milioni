/** Utente azienda dei dati di esempio locali (scripts/seed.ts), mostrato a schermo solo in sviluppo. */
export const DEMO_ACCOUNT = { email: "mario@rossiimpianti.it", password: "geco-demo-2026" } as const;

/** Amministratore dei dati di esempio locali: entra nel gestionale /admin con la stessa password di prova. */
export const ADMIN_DEMO_ACCOUNT = { email: "admin@gecoitalia.it", password: DEMO_ACCOUNT.password } as const;
