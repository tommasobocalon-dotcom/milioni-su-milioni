import "server-only";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { authTokens, users } from "@/lib/db/schema";
import { AUTH_TOKEN_TTL_MINUTES, authTokenUsable, hashAuthToken, newAuthToken, type AuthTokenPurpose } from "@/lib/domain/auth-token";
import { sendEmail, showDevLinks } from "@/lib/notify";

/** Massimo di link dello stesso tipo per persona in un'ora: niente caselle email bombardate. */
const PER_HOUR = 3;

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

/** Crea un link monouso; null se ne sono già partiti troppi nell'ultima ora. */
async function issue(userId: string, purpose: AuthTokenPurpose): Promise<string | null> {
  const [row] = await db
    .select({ n: count() })
    .from(authTokens)
    .where(and(eq(authTokens.userId, userId), eq(authTokens.purpose, purpose), gt(authTokens.createdAt, new Date(Date.now() - 3600_000))));
  if ((row?.n ?? 0) >= PER_HOUR) return null;
  const { token, hash } = newAuthToken();
  await db.insert(authTokens).values({
    id: hash,
    userId,
    purpose,
    expiresAt: new Date(Date.now() + AUTH_TOKEN_TTL_MINUTES[purpose] * 60_000),
  });
  return token;
}

/** Il link è ancora buono? Serve per mostrare il modulo o l'avviso "link scaduto" prima di usarlo. */
export async function authTokenValid(token: string, purpose: AuthTokenPurpose): Promise<boolean> {
  const [row] = await db
    .select({ expiresAt: authTokens.expiresAt, usedAt: authTokens.usedAt })
    .from(authTokens)
    .where(and(eq(authTokens.id, hashAuthToken(token)), eq(authTokens.purpose, purpose)))
    .limit(1);
  return row ? authTokenUsable(row) : false;
}

/**
 * Usa il link una volta sola, in modo atomico: due clic contemporanei non passano entrambi.
 * Restituisce l'utente, o null se il link non esiste, è scaduto o è già stato usato.
 */
export async function consumeAuthToken(
  tx: Pick<typeof db, "update">,
  token: string,
  purpose: AuthTokenPurpose,
): Promise<string | null> {
  const [row] = await tx
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.id, hashAuthToken(token)), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .returning({ userId: authTokens.userId });
  return row?.userId ?? null;
}

/** Per lo sviluppo e il sito di prova: il link da mostrare a schermo, visto che l'email non parte davvero. */
export type DevLink = { devLink?: string };

export async function sendPasswordResetLink(email: string): Promise<DevLink> {
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) return {};
  const token = await issue(user.id, "password_reset");
  if (!token) return {};
  const link = `${appUrl()}/accedi/nuova-password?token=${token}`;
  await sendEmail(
    email,
    "Scegli una nuova password per geco",
    `Ciao ${user.name},\n\nqualcuno (speriamo tu) ha chiesto di cambiare la password del tuo account geco.\n` +
      `Apri questo link entro un'ora per sceglierne una nuova:\n\n${link}\n\n` +
      `Se non sei stato tu, ignora questa email: la password resta quella di prima.`,
  );
  return showDevLinks() ? { devLink: link } : {};
}

export async function sendEmailVerificationLink(user: { id: string; email: string; name: string }): Promise<DevLink> {
  const token = await issue(user.id, "email_verify");
  if (!token) return {};
  const link = `${appUrl()}/auth/verifica-email?token=${token}`;
  await sendEmail(
    user.email,
    "Conferma la tua email su geco",
    `Ciao ${user.name},\n\nconferma che questo indirizzo è tuo aprendo il link (vale 24 ore):\n\n${link}\n\n` +
      `Se non hai creato un account su geco, ignora questa email.`,
  );
  return showDevLinks() ? { devLink: link } : {};
}
