/**
 * Scorciatoie per provare l'app senza servizi esterni: codice SMS a schermo, account di prova nella
 * pagina di accesso, acquisto di token senza pagamento. Attive in sviluppo e sul sito di prova
 * (DEMO_MODE=1), ma solo se è protetto da password (SITE_ACCESS): mai sul sito pubblico.
 */
export function demoMode(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.DEMO_MODE === "1" && Boolean(process.env.SITE_ACCESS?.trim());
}
