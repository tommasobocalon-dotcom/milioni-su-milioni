import { connection } from "next/server";
import { FollowButton } from "@/components/site/follow-button";
import { getAnySessionUser } from "@/lib/auth/session";
import { getFollowedPartnerIds, getFollowerCount } from "@/lib/data/follows";
import { followLoginHref } from "@/lib/domain/follows";

/**
 * "Segui" con il conto dei follower per le pagine di un'azienda (scheda, pagina di un lavoro). Legge la sessione,
 * quindi va sempre dentro un <Suspense>: il resto della pagina resta in cache.
 */
export async function PartnerFollow({ partnerId, partnerName, returnTo, className }: { partnerId: string; partnerName: string; returnTo: string; className?: string }) {
  // Prima di qualsiasi lettura dal database: le schede sono pre-generate al build (generateStaticParams) e senza
  // questo il conto dei follower partiva già durante il build, contro il database online (13/11/2026).
  await connection();
  const [user, count] = await Promise.all([getAnySessionUser(), getFollowerCount(partnerId)]);
  const following = user ? (await getFollowedPartnerIds(user.id, [partnerId])).has(partnerId) : false;
  return (
    <FollowButton
      partnerId={partnerId}
      partnerName={partnerName}
      following={following}
      count={count}
      signedIn={!!user}
      loginHref={followLoginHref(returnTo)}
      showCount
      className={className}
    />
  );
}
