/** Regole degli extra a token del documento del 4/11/2026: provincia vicina e video del portfolio Premium. */

/** Province venete confinanti (per ora la piattaforma copre solo il Veneto). */
const NEIGHBOURS: Record<string, string[]> = {
  VE: ["PD", "TV", "RO"],
  PD: ["VE", "VI", "TV", "RO", "VR"],
  TV: ["BL", "VI", "PD", "VE"],
  VI: ["VR", "PD", "TV", "BL"],
  VR: ["VI", "PD", "RO"],
  BL: ["TV", "VI"],
  RO: ["VE", "PD", "VR"],
};

export function neighbourProvinces(code: string): string[] {
  return NEIGHBOURS[code] ?? [];
}

/**
 * Indirizzo da incorporare per un link YouTube o Vimeo, oppure null. YouTube nella versione senza cookie.
 * Solo id validi: niente altro finisce nell'iframe.
 */
export function videoEmbedUrl(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");
  const youtubeId = host === "youtu.be" ? url.pathname.slice(1) : host === "youtube.com" || host === "m.youtube.com" ? url.searchParams.get("v") : null;
  if (youtubeId !== null) return /^[\w-]{11}$/.test(youtubeId) ? `https://www.youtube-nocookie.com/embed/${youtubeId}` : null;
  if (host === "vimeo.com") {
    const id = url.pathname.slice(1);
    return /^\d{6,12}$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

/** Foto di un progetto in Ispirazione e nella scheda (12/11/2026): da 2 a 8. */
export const PROJECT_PHOTOS = { min: 2, max: 8 } as const;

export function projectPhotosError(count: number): string | null {
  if (count < PROJECT_PHOTOS.min) return `Carica almeno ${PROJECT_PHOTOS.min} foto del lavoro`;
  if (count > PROJECT_PHOTOS.max) return `Al massimo ${PROJECT_PHOTOS.max} foto per progetto`;
  return null;
}
