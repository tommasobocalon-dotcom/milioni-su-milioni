import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/** Parametri scrypt (OWASP: N=2^17, r=8, p=1). Salvati nell'hash, così si possono alzare in futuro. */
const N = 2 ** 17;
const R = 8;
const P = 1;
const KEY_LEN = 32;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEY_LEN, { N: n, r, p, maxmem: 256 * n * r }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

/** Formato: scrypt$N$r$p$salt$hash (base64url). La password non viene mai salvata in chiaro. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const parts = stored?.split("$") ?? [];
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  if (![n, r, p].every(Number.isSafeInteger) || n > 2 ** 20) return false;
  const expected = Buffer.from(parts[5], "base64url");
  const actual = await derive(password, Buffer.from(parts[4], "base64url"), n, r, p);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Hash fittizio: chi prova un'email inesistente aspetta quanto chi la indovina (niente enumerazione). */
let dummy: Promise<string> | undefined;
export async function burnPasswordCheck(password: string): Promise<false> {
  await verifyPassword(password, await (dummy ??= hashPassword("geco-dummy-password")));
  return false;
}

/** Regole della password nuova; null se va bene. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `La password deve avere almeno ${PASSWORD_MIN} caratteri`;
  if (password.length > PASSWORD_MAX) return `La password può avere al massimo ${PASSWORD_MAX} caratteri`;
  if (!password.trim()) return "La password non può essere fatta solo di spazi";
  return null;
}
