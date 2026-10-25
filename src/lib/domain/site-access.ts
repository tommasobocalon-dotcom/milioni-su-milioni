import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Accesso riservato al team per il sito di prova: HTTP Basic Auth con gli accessi della variabile
 * SITE_ACCESS ("nome:password,nome2:password2"). Senza variabile il sito è aperto (sviluppo, lancio).
 */
export type SiteLogin = { user: string; password: string };

/** null = sito aperto. Un valore presente ma senza accessi validi dà un elenco vuoto: non entra nessuno. */
export function parseSiteAccess(raw: string | undefined): SiteLogin[] | null {
  if (!raw?.trim()) return null;
  return raw.split(",").flatMap((entry) => {
    const sep = entry.indexOf(":");
    const user = entry.slice(0, sep).trim();
    const password = entry.slice(sep + 1).trim();
    return sep > 0 && user && password ? [{ user, password }] : [];
  });
}

const digest = (value: string) => createHash("sha256").update(value).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

export function hasSiteAccess(authorization: string | null, logins: SiteLogin[]): boolean {
  const [scheme, encoded] = authorization?.split(" ") ?? [];
  if (scheme !== "Basic" || !encoded) return false;
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  const user = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);
  return logins.some((login) => same(login.user, user) && same(login.password, password));
}
