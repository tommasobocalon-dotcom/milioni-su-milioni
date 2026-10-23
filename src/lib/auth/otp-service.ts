import "server-only";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { otpCodes } from "@/lib/db/schema";
import { checkOtp, generateOtpCode, hashOtp, OTP_TTL_MINUTES, type OtpCheck } from "@/lib/domain/otp";

/** Limiti anti-abuso per destinatario (PRD §5.5, requisiti antispam). */
const LIMITS = { perTenMinutes: 3, perDay: 8 };

function pepper(): string {
  const p = process.env.OTP_PEPPER;
  if (!p || p.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("OTP_PEPPER mancante o troppo corto");
    return "solo-sviluppo-solo-sviluppo-solo-sviluppo";
  }
  return p;
}

export class OtpRateLimitError extends Error {
  constructor() {
    super("Troppi codici richiesti per questo contatto. Riprova tra qualche minuto.");
    this.name = "OtpRateLimitError";
  }
}

export async function issueOtp(input: {
  purpose: "login" | "lead";
  channel: "email" | "sms";
  target: string;
  leadId?: string;
}): Promise<{ code: string; expiresAt: Date }> {
  const now = new Date();
  const [{ last10, last24 }] = await db
    .select({
      last10: sql<number>`count(*) filter (where ${otpCodes.createdAt} > ${new Date(now.getTime() - 10 * 60_000).toISOString()}::timestamptz)::int`,
      last24: sql<number>`count(*)::int`,
    })
    .from(otpCodes)
    .where(and(eq(otpCodes.target, input.target), gt(otpCodes.createdAt, new Date(now.getTime() - 24 * 3600_000))));
  if (last10 >= LIMITS.perTenMinutes || last24 >= LIMITS.perDay) throw new OtpRateLimitError();

  const code = generateOtpCode();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60_000);
  await db.insert(otpCodes).values({
    purpose: input.purpose,
    channel: input.channel,
    target: input.target,
    codeHash: hashOtp(code, input.target, pepper()),
    expiresAt,
    leadId: input.leadId ?? null,
  });
  return { code, expiresAt };
}

/** Verifica l'ultimo codice valido per quel destinatario (e quella richiesta, se indicata). */
export async function verifyOtp(input: {
  purpose: "login" | "lead";
  target: string;
  code: string;
  leadId?: string;
}): Promise<OtpCheck> {
  const now = new Date();
  const [record] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.purpose, input.purpose),
        eq(otpCodes.target, input.target),
        input.leadId ? eq(otpCodes.leadId, input.leadId) : undefined,
        isNull(otpCodes.consumedAt),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!record) return "expired";

  const result = checkOtp(record, input.code, pepper(), now);
  if (result === "ok") {
    await db.update(otpCodes).set({ consumedAt: now }).where(eq(otpCodes.id, record.id));
  } else if (result === "wrong") {
    await db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(eq(otpCodes.id, record.id));
  }
  return result;
}
