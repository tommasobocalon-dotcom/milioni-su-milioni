"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { issueOtp, OtpRateLimitError, verifyOtp } from "@/lib/auth/otp-service";
import { createSession, destroySession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { partnerMembers, users } from "@/lib/db/schema";
import { normalizeEmail } from "@/lib/domain/otp";
import { sendEmail, showDevCodes } from "@/lib/notify";

async function partnerUserByEmail(email: string) {
  const [u] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .innerJoin(partnerMembers, eq(partnerMembers.userId, users.id))
    .where(eq(users.email, email))
    .limit(1);
  return u ?? null;
}

export type RequestCodeResult = { ok: true; email: string; devCode?: string } | { ok: false; error: string };

/** Invia il codice di accesso. Risponde sempre allo stesso modo per non rivelare quali email sono registrate. */
export async function requestLoginCode(rawEmail: string): Promise<RequestCodeResult> {
  const parsed = z.email().safeParse(normalizeEmail(rawEmail));
  if (!parsed.success) return { ok: false, error: "Controlla l'indirizzo email" };
  const email = parsed.data;
  const user = await partnerUserByEmail(email);
  if (!user) return { ok: true, email };
  try {
    const { code } = await issueOtp({ purpose: "login", channel: "email", target: email });
    await sendEmail(email, "Il tuo codice di accesso", `Ciao ${user.name}, il tuo codice per entrare nell'Area Partner è ${code}. Scade tra 10 minuti.`);
    return { ok: true, email, devCode: showDevCodes() ? code : undefined };
  } catch (e) {
    if (e instanceof OtpRateLimitError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function verifyLoginCode(rawEmail: string, code: string): Promise<{ ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  if (!/^\d{6}$/.test(code.trim())) return { ok: false, error: "Il codice è di 6 cifre" };
  const user = await partnerUserByEmail(email);
  const check = user ? await verifyOtp({ purpose: "login", target: email, code }) : "wrong";
  if (check === "wrong") return { ok: false, error: "Codice non corretto" };
  if (check === "expired") return { ok: false, error: "Il codice è scaduto: chiedine uno nuovo" };
  if (check === "locked") return { ok: false, error: "Troppi tentativi: chiedi un nuovo codice" };
  await createSession(user!.id);
  redirect("/area-partner");
}

export async function logout() {
  await destroySession();
  redirect("/accedi");
}
