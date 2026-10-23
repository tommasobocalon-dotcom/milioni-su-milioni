import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_TTL_MINUTES = 10;
export const MAX_OTP_ATTEMPTS = 5;

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Il codice si conserva solo come HMAC legato al destinatario: mai in chiaro. */
export function hashOtp(code: string, target: string, pepper: string): string {
  return createHmac("sha256", pepper).update(`${target}:${code}`).digest("hex");
}

export type OtpRecord = {
  codeHash: string;
  target: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
};

export type OtpCheck = "ok" | "wrong" | "expired" | "locked";

export function checkOtp(record: OtpRecord, code: string, pepper: string, now: Date): OtpCheck {
  if (record.consumedAt || record.expiresAt.getTime() <= now.getTime()) return "expired";
  if (record.attempts >= MAX_OTP_ATTEMPTS) return "locked";
  const expected = Buffer.from(record.codeHash, "hex");
  const actual = Buffer.from(hashOtp(code.trim(), record.target, pepper), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? "ok" : "wrong";
}

/** Normalizza un numero italiano in formato E.164 (+39…). Restituisce null se non è valido. */
export function normalizeItalianPhone(input: string): string | null {
  let digits = input.replace(/[\s.\-()/]/g, "");
  if (digits.startsWith("+39")) digits = digits.slice(3);
  else if (digits.startsWith("0039")) digits = digits.slice(4);
  if (!/^\d+$/.test(digits)) return null;
  // Cellulari: 3xx, 9-10 cifre. Fissi: iniziano con 0, 6-11 cifre.
  const mobile = /^3\d{8,9}$/.test(digits);
  const landline = /^0\d{5,10}$/.test(digits);
  return mobile || landline ? `+39${digits}` : null;
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** Mostra solo le ultime cifre di un telefono (es. nei messaggi di conferma). */
export function maskPhone(e164: string): string {
  return e164.replace(/^(\+39)(\d+)(\d{3})$/, (_, p, mid: string, end) => `${p} ${"•".repeat(mid.length)}${end}`);
}
