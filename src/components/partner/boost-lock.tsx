import { Lock } from "lucide-react";
import { requirePartner } from "@/lib/auth/session";
import { getSubscription } from "@/lib/data/partner-area";
import { canBoost } from "@/lib/domain/ranking";

/** Lucchetto accanto a "Boost e sponsorizzazioni" quando il piano non li consente (Base o nessun piano attivo). */
export async function BoostLock() {
  // Nel layout su ogni pagina (anche abbonamento): da sospeso non deve rimbalzare via, come la campanella.
  const { partner } = await requirePartner({ allowSuspended: true });
  const sub = await getSubscription(partner.id);
  if (sub && canBoost(sub.planWeight)) return null;
  return (
    <span className="ml-auto" title="Disponibile con i piani Normal e Premium">
      <Lock className="size-4" aria-hidden />
      <span className="sr-only">(bloccato con il tuo piano)</span>
    </span>
  );
}
