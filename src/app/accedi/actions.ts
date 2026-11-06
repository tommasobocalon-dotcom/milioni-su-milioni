"use server";

import { and, count, eq, gt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { consumeAuthToken, sendEmailVerificationLink, sendPasswordResetLink } from "@/lib/auth/email-links";
import { createSession, destroySession, getAnySessionUser, landingPathFor, type Audience } from "@/lib/auth/session";
import { ipRateLimited } from "@/lib/security/ip-limit";
import { TURNSTILE_ERROR, turnstileOk } from "@/lib/security/turnstile";
import { db } from "@/lib/db/client";
import { auditLogs, oauthAccounts, sessions, users } from "@/lib/db/schema";
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

export async function signIn(rawEmail: string, password: string, next?: string, audience: Audience = "client"): Promise<AuthResult> {
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
  await createSession(user.id, audience);
  redirect(await landingPathFor(user.id, audience, next));
}

export async function signUp(
  rawName: string,
  rawEmail: string,
  password: string,
  next?: string,
  audience: Audience = "client",
  turnstileToken?: string,
): Promise<AuthResult> {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Scrivi nome e cognome", field: "name" };
  const email = parseEmail(rawEmail);
  if (!email) return { ok: false, error: "Controlla l'indirizzo email", field: "email" };
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem, field: "password" };
  if (await ipRateLimited("signup", 20, 60)) return { ok: false, error: "Troppi tentativi da questo dispositivo. Riprova tra qualche minuto." };
  if (!(await turnstileOk(turnstileToken))) return { ok: false, error: TURNSTILE_ERROR };

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
  // Un intoppo del provider email non deve bloccare la registrazione: il link si può rimandare dall'area personale.
  await sendEmailVerificationLink({ id: created.id, email, name }).catch((e) => console.error("[auth] email di conferma non inviata:", e));
  await createSession(created.id, audience);
  redirect(await landingPathFor(created.id, audience, next));
}

/** Esce dall'accesso clienti (Area cliente). */
export async function logout() {
  await destroySession("client");
  redirect("/accedi");
}

/** Esce dall'accesso aziende (Area Partner). */
export async function logoutBusiness() {
  await destroySession("business");
  redirect("/accedi/azienda");
}

export type LinkResult = { ok: true; devLink?: string } | AuthResult;

/** "Password dimenticata": stessa risposta che l'email sia iscritta o no. */
export async function requestPasswordReset(rawEmail: string, turnstileToken?: string): Promise<LinkResult> {
  const email = parseEmail(rawEmail);
  if (!email) return { ok: false, error: "Controlla l'indirizzo email", field: "email" };
  if (await ipRateLimited("password_reset", 10, 60)) return { ok: false, error: "Troppe richieste da questo dispositivo. Riprova tra un'ora." };
  if (!(await turnstileOk(turnstileToken))) return { ok: false, error: TURNSTILE_ERROR };
  const { devLink } = await sendPasswordResetLink(email);
  return { ok: true, devLink };
}

/** Nuova password dal link: vale una volta sola, chiude le sessioni aperte altrove e fa entrare. */
export async function resetPassword(token: string, password: string): Promise<AuthResult> {
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem, field: "password" };
  const passwordHash = await hashPassword(password);
  const userId = await db.transaction(async (tx) => {
    const id = await consumeAuthToken(tx, token, "password_reset");
    if (!id) return null;
    // Chi apre il link dimostra di avere l'email: la consideriamo confermata.
    await tx.update(users).set({ passwordHash, emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` }).where(eq(users.id, id));
    await tx.delete(sessions).where(eq(sessions.userId, id));
    await tx.insert(auditLogs).values({ actor: id, action: "auth.password_reset", entity: "user", entityId: id });
    return id;
  });
  if (!userId) return { ok: false, error: "Il link non è più valido: chiedine uno nuovo." };
  await createSession(userId);
  redirect(await landingPathFor(userId));
}

/** Rimanda il link di conferma dell'email a chi è dentro e non l'ha ancora confermata. */
export async function resendEmailVerification(): Promise<LinkResult> {
  const user = await getAnySessionUser();
  if (!user) redirect("/accedi");
  const [row] = await db.select({ verified: users.emailVerifiedAt }).from(users).where(eq(users.id, user.id)).limit(1);
  if (row?.verified) return { ok: true };
  const { devLink } = await sendEmailVerificationLink(user);
  return { ok: true, devLink };
}
