"use client";

import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { followPartner } from "@/app/(pubblico)/ispirazione/actions";
import { buttonVariants } from "@/components/ui/button";
import { applyFollow, followersLabel, type FollowState } from "@/lib/domain/follows";
import { cn } from "@/lib/utils";

const MESSAGES = {
  limit: "Troppi clic in poco tempo: riprova tra un minuto.",
  missing: "Questa azienda non è più disponibile.",
  login: "Accedi per seguire le aziende.",
  own: "Questa è la tua azienda: non serve seguirla.",
  network: "Non siamo riusciti a salvare: riprova.",
} as const;

/**
 * "Segui" / "Segui già" su un'azienda. Chi ha fatto l'accesso segue e smette con un clic (lo stato cambia subito e
 * poi si allinea al server, anche sugli altri lavori della stessa azienda nella pagina); chi non l'ha fatto trova un
 * link all'accesso, che riporta qui. Con `showCount` accanto c'è il numero dei follower.
 */
export function FollowButton({
  partnerId,
  partnerName,
  following,
  count,
  signedIn,
  loginHref,
  showCount = false,
  className,
}: {
  partnerId: string;
  partnerName: string;
  following: boolean;
  count: number;
  signedIn: boolean;
  loginHref: string;
  showCount?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<FollowState>({ following, count });
  const [fromServer, setFromServer] = useState({ following, count });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Dopo un aggiornamento della pagina il server può dire altro (es. si è seguita l'azienda da un altro lavoro).
  if (fromServer.following !== following || fromServer.count !== count) {
    setFromServer({ following, count });
    setState({ following, count });
  }

  function toggle() {
    const before = state;
    const want = !before.following;
    setError(null);
    setState(applyFollow(before, want));
    start(async () => {
      try {
        const res = await followPartner(partnerId, want);
        if (res.ok) {
          setState({ following: res.following, count: res.count });
          router.refresh();
        } else {
          setState(before);
          setError(MESSAGES[res.reason]);
        }
      } catch {
        setState(before);
        setError(MESSAGES.network);
      }
    });
  }

  const look = cn(buttonVariants({ variant: state.following ? "secondary" : "primary", size: "s" }), "rounded-full");

  return (
    <div className={cn("relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {signedIn ? (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={state.following}
          aria-busy={pending}
          aria-label={state.following ? `Segui già ${partnerName}: smetti di seguire` : `Segui ${partnerName}`}
          className={look}
        >
          {state.following ? <Check aria-hidden /> : <Plus aria-hidden />}
          {state.following ? "Segui già" : "Segui"}
        </button>
      ) : (
        <Link href={loginHref} className={look}>
          <Plus aria-hidden />
          Segui
        </Link>
      )}
      {showCount && (
        <span className="text-body-s font-semibold" aria-live="polite">
          {followersLabel(state.count)}
        </span>
      )}
      {error && (
        <p role="alert" className="basis-full text-caption text-error">
          {error}
        </p>
      )}
    </div>
  );
}
