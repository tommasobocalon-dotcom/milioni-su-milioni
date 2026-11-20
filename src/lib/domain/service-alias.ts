/**
 * Servizi con due nomi nell'indirizzo: gli affitti residenziali si chiamano "affitti" nei dati di esempio e
 * "locazione-residenziale" nel database online. Link della Home e ricerca libera devono funzionare con tutti e due.
 */
const ALIASES: Record<string, string[]> = {
  affitti: ["locazione-residenziale"],
  "locazione-residenziale": ["affitti"],
};

export function findService<T extends { slug: string }>(services: T[], slug: string | undefined | null): T | null {
  if (!slug) return null;
  const wanted = [slug, ...(ALIASES[slug] ?? [])];
  for (const s of wanted) {
    const found = services.find((x) => x.slug === s);
    if (found) return found;
  }
  return null;
}
