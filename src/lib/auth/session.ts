import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db/client";
import { partnerMembers, partners, sessions, users } from "@/lib/db/schema";
import { isAdmin } from "@/lib/domain/admin";
import { parseEmailList } from "@/lib/domain/support";

const COOKIE = "geco_session";
const TTL_DAYS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Crea la sessione e imposta il cookie. Solo in Server Action o Route Handler. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 3600_000);
  await db.insert(sessions).values({ id: hash(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Da quale pagina si entra: /accedi (clienti) o /accedi/azienda. */
export type Audience = "client" | "business";

/**
 * Dopo l'accesso: le aziende (membri di un partner) vanno nell'Area Partner. Gli altri vanno nell'Area cliente,
 * oppure alla registrazione partner se sono entrati dall'accesso aziende.
 */
export async function landingPathFor(userId: string, audience: Audience = "client") {
  if (await userIsAdmin(userId)) return "/admin";
  const [m] = await db.select({ id: partnerMembers.userId }).from(partnerMembers).where(eq(partnerMembers.userId, userId)).limit(1);
  if (m) return "/area-partner";
  return audience === "business" ? "/registrazione-partner" : "/area-cliente";
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hash(token)));
  store.delete(COOKIE);
}

export type SessionUser = { id: string; name: string; email: string; role: "client" | "partner" | "sales" | "admin" };

export async function getSessionUser(): Promise<SessionUser | null> {
  // La sessione si legge sempre al momento della richiesta, mai in prerender.
  await connection();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hash(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/accedi");
  return user;
}

/** Ruolo "admin" nel database, oppure email in ADMIN_EMAILS già confermata (src/lib/domain/admin.ts). */
async function userIsAdmin(userId: string): Promise<boolean> {
  const [u] = await db.select({ role: users.role, email: users.email, verifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.id, userId)).limit(1);
  return !!u && isAdmin({ role: u.role, email: u.email, emailVerified: !!u.verifiedAt }, parseEmailList(process.env.ADMIN_EMAILS));
}

/**
 * Backoffice: ogni pagina e azione di /admin passa da qui. Chi non è entrato va al login; chi è entrato
 * ma non è amministratore riceve un 404, così il Backoffice non si rivela.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/accedi?next=/admin");
  if (!(await userIsAdmin(user.id))) notFound();
  return user;
}


export type PartnerSession = {
  user: SessionUser;
  partner: { id: string; slug: string; displayName: string; logoUrl: string | null; type: "agency" | "technician" | "artisan" | "b2b"; accountStatus: string };
  memberRole: "owner" | "member";
};

/**
 * Utente autenticato membro di un partner. Ogni pagina e azione dell'Area Partner passa da qui:
 * l'id del partner viene sempre dalla sessione, mai dal client.
 */
export async function requirePartner(): Promise<PartnerSession> {
  const user = await getSessionUser();
  if (!user) redirect("/accedi/azienda");
  const [m] = await db
    .select({
      memberRole: partnerMembers.role,
      id: partners.id,
      slug: partners.slug,
      displayName: partners.displayName,
      logoUrl: partners.logoUrl,
      type: partners.type,
      accountStatus: partners.accountStatus,
    })
    .from(partnerMembers)
    .innerJoin(partners, eq(partners.id, partnerMembers.partnerId))
    .where(eq(partnerMembers.userId, user.id))
    .limit(1);
  if (!m) redirect("/area-cliente");
  const { memberRole, ...partner } = m;
  return { user, partner, memberRole };
}
