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

async function userByEmail(email: string) {
  const [u] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email)).limit(1);
  return u ?? null;
}

/** Azienda = utente collegato a un partner in partner_members. Tutti gli altri sono clienti. */
async function isPartnerMember(userId: string) {
  const [m] = await db.select({ id: partnerMembers.userId }).from(partnerMembers).where(eq(partnerMembers.userId, userId)).limit(1);
  return !!m;
}

export type RequestCodeResult = { ok: true; email: string; devCode?: string } | { ok: false; error: string };

/** Invia il codice a qualsiasi email valida: chi non ha un account diventa cliente al primo accesso. */
export async function requestLoginCode(rawEmail: string): Promise<RequestCodeResult> {
  const parsed = z.email().safeParse(normalizeEmail(rawEmail));
  if (!parsed.success) return { ok: false, error: "Controlla l'indirizzo email" };
  const email = parsed.data;
  const user = await userByEmail(email);
  try {
    const { code } = await issueOtp({ purpose: "login", channel: "email", target: email });
    await sendEmail(email, "Il tuo codice di accesso", `Ciao${user ? ` ${user.name}` : ""}, il tuo codice per accedere a geco è ${code}. Scade tra 10 minuti.`);
    return { ok: true, email, devCode: showDevCodes() ? code : undefined };
  } catch (e) {
    if (e instanceof OtpRateLimitError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function verifyLoginCode(rawEmail: string, code: string): Promise<{ ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  if (!/^\d{6}$/.test(code.trim())) return { ok: false, error: "Il codice è di 6 cifre" };
  const check = await verifyOtp({ purpose: "login", target: email, code });
  if (check === "wrong") return { ok: false, error: "Codice non corretto" };
  if (check === "expired") return { ok: false, error: "Il codice è scaduto: chiedine uno nuovo" };
  if (check === "locked") return { ok: false, error: "Troppi tentativi: chiedi un nuovo codice" };
  // Primo accesso: nasce un account cliente. Le aziende vengono collegate a un partner alla registrazione.
  if (!(await userByEmail(email))) await db.insert(users).values({ email, name: email.split("@")[0] }).onConflictDoNothing();
  const user = (await userByEmail(email))!;
  await createSession(user.id);
  redirect((await isPartnerMember(user.id)) ? "/area-partner" : "/area-cliente");
}

export async function logout() {
  await destroySession();
  redirect("/accedi");
}
