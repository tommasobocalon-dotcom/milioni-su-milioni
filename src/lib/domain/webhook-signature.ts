import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Firma dei webhook nel formato Svix, usato da Resend: HMAC-SHA256 di "id.timestamp.corpo" con il
 * segreto "whsec_…" (base64). L'intestazione può contenere più firme ("v1,xxx v1,yyy") durante la
 * rotazione del segreto. Si rifiutano gli eventi più vecchi di `toleranceSeconds` (replay).
 */
export function verifySvixSignature(
  body: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  now = Date.now(),
  toleranceSeconds = 300,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > toleranceSeconds) return false;
  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Confronto di due segreti in tempo costante (es. il token nell'URL di un webhook). */
export function sameSecret(given: string, expected: string): boolean {
  return Boolean(expected) && timingSafeEqual(digest(given), digest(expected));
}
