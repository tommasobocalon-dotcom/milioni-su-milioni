import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db/client";
import { partnerMembers, partners, sessions, users } from "@/lib/db/schema";
import { isAdmin } from "@/lib/domain/admin";
import { safeNextPath } from "@/lib/domain/format";
import { parseEmailList } from "@/lib/domain/support";

/**
 * Due accessi separati sullo stesso account: chi entra dall'accesso aziende ha la sessione aziende (solo Area
 * Partner), chi entra dall'accesso clienti quella clienti (Area cliente e gestionale). Entrare da una parte non
 * apre l'altra: ognuna chiede il suo login.
 */
const COOKIE = { client: "geco_session", business: "geco_session_azienda" } as const;
const TTL_DAYS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Da quale pagina si entra: /accedi (clienti) o /accedi/azienda. */
export type Audience = "client" | "business";

/** Crea la sessione e imposta il cookie dell'accesso scelto. Solo in Server Action o Route Handler. */
export async function createSession(userId: string, audience: Audience = "client") {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 3600_000);
  await db.insert(sessions).values({ id: hash(token), userId, expiresAt });
  (await cookies()).set(COOKIE[audience], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Dopo l'accesso: la pagina richiesta (`next`), se è della stessa area. Accesso clienti: Area cliente (o gestionale
 * per gli amministratori). Accesso aziende: Area Partner per chi ha un'azienda, altrimenti la registrazione partner.
 * Chi non ha ancora un'azienda e chiedeva una pagina dell'Area Partner (es. "Il tuo logo qui") va prima a registrarla.
 */
export async function landingPathFor(userId: string, audience: Audience = "client", next?: string) {
  const target = next?.startsWith("/accedi") ? null : safeNextPath(next);
  if (audience === "client") {
    if (target && !target.startsWith("/area-partner") && target !== "/registrazione-partner") return target;
    // Con il gestionale su un indirizzo suo (ADMIN_URL) il cookie del sito non vale lì: sul sito l'admin resta un utente normale.
    if (!process.env.ADMIN_URL && (await userIsAdmin(userId))) return "/admin";
    return "/area-cliente";
  }
  if (target && !target.startsWith("/area-partner")) return target;
  const [m] = await db.select({ id: partnerMembers.userId }).from(partnerMembers).where(eq(partnerMembers.userId, userId)).limit(1);
  return m ? (target ?? "/area-partner") : "/registrazione-partner";
}

export async function destroySession(audience: Audience = "client") {
  const store = await cookies();
  const token = store.get(COOKIE[audience])?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hash(token)));
  store.delete(COOKIE[audience]);
  if (audience === "business") store.delete(COMPANY_COOKIE);
}

export type SessionUser = { id: string; name: string; email: string; role: "client" | "partner" | "sales" | "admin" };

export async function getSessionUser(audience: Audience = "client"): Promise<SessionUser | null> {
  // La sessione si legge sempre al momento della richiesta, mai in prerender.
  await connection();
  const token = (await cookies()).get(COOKIE[audience])?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hash(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function requireUser(audience: Audience = "client"): Promise<SessionUser> {
  const user = await getSessionUser(audience);
  if (!user) redirect(audience === "business" ? "/accedi/azienda" : "/accedi");
  return user;
}

/** Chi è entrato da almeno uno dei due accessi (assistenza, conferma email): prima quello clienti. */
export async function getAnySessionUser(): Promise<SessionUser | null> {
  return (await getSessionUser("client")) ?? (await getSessionUser("business"));
}

/** Ruolo "admin" nel database, oppure email in ADMIN_EMAILS già confermata (src/lib/domain/admin.ts). */
export async function userIsAdmin(userId: string): Promise<boolean> {
  const [u] = await db.select({ role: users.role, email: users.email, verifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.id, userId)).limit(1);
  return !!u && isAdmin({ role: u.role, email: u.email, emailVerified: !!u.verifiedAt }, parseEmailList(process.env.ADMIN_EMAILS));
}

/**
 * Backoffice: ogni pagina e azione di /admin passa da qui. Chi non è entrato va al login del gestionale; chi è entrato
 * ma non è amministratore riceve un 404, così il Backoffice non si rivela.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getAnySessionUser();
  if (!user) redirect("/admin/accedi");
  if (!(await userIsAdmin(user.id))) notFound();
  return user;
}


/** Azienda scelta nell'Area Partner da chi ne ha più di una. */
export const COMPANY_COOKIE = "geco_azienda";

/** Aziende dell'account, in ordine fisso: la prima registrata per prima. */
export async function partnersOfUser(userId: string) {
  return db
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
    .where(eq(partnerMembers.userId, userId))
    .orderBy(partners.createdAt, partners.id);
}

export type PartnerSession = {
  user: SessionUser;
  partner: { id: string; slug: string; displayName: string; logoUrl: string | null; type: "agency" | "technician" | "artisan" | "b2b"; accountStatus: string };
  memberRole: "owner" | "member";
};

/**
 * Utente autenticato membro di un partner. Ogni pagina e azione dell'Area Partner passa da qui:
 * l'id del partner viene sempre dalla sessione, mai dal client.
 *
 * Account sospeso (pagamento fallito): l'Area Partner si riduce al solo pagamento, così il partner
 * torna attivo pagando. Le pagine e azioni che devono restare raggiungibili (abbonamento, portale
 * Stripe) chiamano `requirePartner({ allowSuspended: true })`.
 */
export async function requirePartner(opts: { allowSuspended?: boolean } = {}): Promise<PartnerSession> {
  const user = await getSessionUser("business");
  if (!user) redirect("/accedi/azienda");
  // Un account può avere più aziende: vale quella scelta (cookie), altrimenti sempre la stessa, la prima registrata.
  // Senza un ordine fisso Postgres ne restituiva una a caso e pagine e azioni finivano su aziende diverse (12/11/2026).
  const all = await partnersOfUser(user.id);
  const chosen = (await cookies()).get(COMPANY_COOKIE)?.value;
  const m = all.find((p) => p.id === chosen) ?? all[0];
  if (!m) redirect("/area-cliente");
  const { memberRole, ...partner } = m;
  if (partner.accountStatus === "suspended" && !opts.allowSuspended) redirect("/area-partner/abbonamento");
  return { user, partner, memberRole };
}
