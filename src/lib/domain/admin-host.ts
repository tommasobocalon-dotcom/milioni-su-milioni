/**
 * Gestionale su un indirizzo proprio (ADMIN_URL, es. https://admin.gecoitalia.it), separato dal sito.
 * Senza ADMIN_URL (sviluppo, test, prima di configurare il dominio) il gestionale resta su /admin del sito.
 */

export type HostRoute = { action: "next" } | { action: "redirect"; location: string } | { action: "not-found" };

const isAdminPath = (p: string) => p === "/admin" || p.startsWith("/admin/");
/** File statici (icone, immagini del geco, manifest): servono anche al gestionale. */
const isAsset = (p: string) => p.startsWith("/_next/") || /\.[a-z0-9]{2,12}$/i.test(p);

/**
 * Cosa fare di una richiesta in base all'indirizzo:
 * - sull'indirizzo del gestionale: "/" porta al gestionale, le pagine del sito portano al sito;
 * - sul sito: /admin non esiste (404), così il gestionale non si vede da fuori.
 */
export function routeByHost(input: { host: string; pathname: string; search: string; adminUrl?: string; siteUrl?: string }): HostRoute {
  if (!input.adminUrl) return { action: "next" };
  const admin = new URL(input.adminUrl);
  if (input.host.toLowerCase() === admin.host.toLowerCase()) {
    if (input.pathname === "/") return { action: "redirect", location: `${admin.origin}/admin` };
    if (isAdminPath(input.pathname) || isAsset(input.pathname)) return { action: "next" };
    if (!input.siteUrl) return { action: "not-found" };
    return { action: "redirect", location: `${new URL(input.siteUrl).origin}${input.pathname}${input.search}` };
  }
  return isAdminPath(input.pathname) ? { action: "not-found" } : { action: "next" };
}

/** Indirizzo da usare nei link al gestionale (email di avviso, "Vai al gestionale"). */
export function adminBaseUrl(adminUrl: string | undefined, siteUrl: string): string {
  return (adminUrl ? new URL(adminUrl).origin : new URL(siteUrl).origin) + "/admin";
}
