import { eq } from "drizzle-orm";
import { MailCheck } from "lucide-react";
import { getSessionUser, type Audience } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { ResendVerificationButton } from "./resend-verification-button";

/** Avviso nelle aree personali finché l'email non è confermata. Va dentro <Suspense>: legge la sessione. */
export async function EmailVerifyBanner({ audience }: { audience: Audience }) {
  const user = await getSessionUser(audience);
  if (!user) return null;
  const [row] = await db.select({ verified: users.emailVerifiedAt }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || row.verified) return null;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-info bg-info-soft p-4 text-body-s text-ink sm:flex-row sm:items-center">
      <MailCheck aria-hidden className="size-5 shrink-0 text-info" />
      <p className="flex-1">
        Conferma la tua email: ti abbiamo mandato un link a <strong>{user.email}</strong>. Serve per recuperare l&apos;accesso e ricevere gli
        avvisi.
      </p>
      <ResendVerificationButton />
    </div>
  );
}
