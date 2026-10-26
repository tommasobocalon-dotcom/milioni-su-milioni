import { eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { consumeAuthToken } from "@/lib/auth/email-links";
import { getSessionUser, landingPathFor } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { auditLogs, users } from "@/lib/db/schema";

/** Link di conferma dell'email (vale 24 ore, una volta sola). */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const confirmed = await db.transaction(async (tx) => {
    const userId = await consumeAuthToken(tx, token, "email_verify");
    if (!userId) return false;
    await tx.update(users).set({ emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` }).where(eq(users.id, userId));
    await tx.insert(auditLogs).values({ actor: userId, action: "auth.email_verified", entity: "user", entityId: userId });
    return true;
  });
  // Chi è già dentro torna nella sua area (l'avviso "conferma la tua email" sparisce o resta col tasto per rimandarlo).
  const user = await getSessionUser();
  const target = user ? await landingPathFor(user.id) : `/accedi?avviso=${confirmed ? "email-confermata" : "link-scaduto"}`;
  return NextResponse.redirect(new URL(target, request.url), 303);
}
