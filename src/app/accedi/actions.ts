"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, landingPathFor } from "@/lib/auth/session";
import { ipRateLimited } from "@/lib/security/ip-limit";
import { db } from "@/lib/db/client";
import { auditLogs, oauthAccounts, users } from "@/lib/db/schema";
import { safeNextPath } from "@/lib/domain/format";
import { normalizeEmail } from "@/lib/domain/otp";
import { burnPasswordCheck, hashPassword, PASSWORD_MAX, passwordProblem, verifyPassword } from "@/lib/domain/password";

export type AuthResult = { ok: false; error: string; field?: "name" | "email" | "password" };

/** Anti forza bruta per email: oltre 10 password sbagliate in 15 minuti l'accesso si ferma. */
const FAILED_LIMIT = { attempts: 10, minutes: 15 };

async function recentFailures(email: string) {
  const since = new Date(Date.now() - FAILED_LIMIT.minutes * 60_000);
  const [row] = await db
    .select({ n: count() })
    .from(auditLogs)
    .where(and(eq(auditLogs.entity, "login"), eq(auditLogs.entityId, email), eq(auditLogs.action, "auth.login_failed"), gt(auditLogs.createdAt, since)));
  return row?.n ?? 0;
}

function parseEmail(raw: string) {
  const parsed = z.email().safeParse(normalizeEmail(raw));
  return parsed.success ? parsed.data : null;
}

export async function signIn(rawEmail: string, password: string, next?: string): Promise<AuthResult> {
  const email = parseEmail(rawEmail);
  if (!email) return { ok: false, error: "Controlla l'indirizzo email", field: "email" };
  if (!password || password.length > PASSWORD_MAX) return { ok: false, error: "Inserisci la password", field: "password" };
  if (await ipRateLimited("login", 50, 15)) return { ok: false, error: "Troppi tentativi da questo dispositivo. Riprova tra qualche minuto." };
  if ((await recentFailures(email)) >= FAILED_LIMIT.attempts) {
    return { ok: false, error: `Troppi tentativi sbagliati. Riprova tra ${FAILED_LIMIT.minutes} minuti.` };
  }

  const [user] = await db.select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.email, email)).limit(1);
  // Stesso tempo e stesso messaggio se l'email non esiste o non ha password: niente indizi su chi è iscritto.
  const valid = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : await burnPasswordCheck(password);
  if (!user || !valid) {
    await db.insert(auditLogs).values({ actor: email, action: "auth.login_failed", entity: "login", entityId: email });
    return { ok: false, error: "Email o password non corretti" };
  }
  await createSession(user.id);
  redirect(safeNextPath(next) ?? (await landingPathFor(user.id)));
}

export async function signUp(rawName: string, rawEmail: string, password: string, next?: string): Promise<AuthResult> {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Scrivi nome e cognome", field: "name" };
  const email = parseEmail(rawEmail);
  if (!email) return { ok: false, error: "Controlla l'indirizzo email", field: "email" };
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem, field: "password" };
  if (await ipRateLimited("signup", 20, 60)) return { ok: false, error: "Troppi tentativi da questo dispositivo. Riprova tra qualche minuto." };

  const [existing] = await db.select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    // Un account nato con Google/Apple non riceve una password da chi non ha dimostrato di possedere l'email.
    const [social] = existing.passwordHash
      ? []
      : await db.select({ provider: oauthAccounts.provider }).from(oauthAccounts).where(eq(oauthAccounts.userId, existing.id)).limit(1);
    const via = social ? ` con ${social.provider === "google" ? "Google" : "Apple"}` : "";
    return { ok: false, error: `Esiste già un account con questa email: accedi${via}`, field: "email" };
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db.insert(users).values({ email, name, passwordHash }).onConflictDoNothing().returning({ id: users.id });
  if (!created) return { ok: false, error: "Esiste già un account con questa email: accedi", field: "email" };
  await db.insert(auditLogs).values({ actor: email, action: "auth.signup", entity: "user", entityId: created.id });
  await createSession(created.id);
  redirect(safeNextPath(next) ?? (await landingPathFor(created.id)));
}

export async function logout() {
  await destroySession();
  redirect("/accedi");
}
