"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { likeWork } from "@/app/(pubblico)/ispirazione/actions";
import { applyLike, likesLabel, type LikeState } from "@/lib/domain/likes";
import { cn } from "@/lib/utils";

const MESSAGES = {
  limit: "Troppi clic in poco tempo: riprova tra un minuto.",
  missing: "Questo lavoro non è più disponibile.",
  login: "Accedi per mettere mi piace.",
  network: "Non siamo riusciti a salvare il tuo mi piace: riprova.",
} as const;

const control =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-[background-color,transform] duration-150 hover:bg-subtle motion-safe:active:scale-90";

/**
 * Cuore con il conto dei "mi piace" di un lavoro. Chi ha fatto l'accesso lo mette e lo toglie con un clic (il conto
 * cambia subito e poi si allinea a quello del server); chi non l'ha fatto trova un link all'accesso, che riporta qui.
 */
export function LikeButton({
  itemId,
  liked,
  count,
  signedIn,
  loginHref,
  className,
}: {
  itemId: string;
  liked: boolean;
  count: number;
  signedIn: boolean;
  loginHref: string;
  className?: string;
}) {
  const [state, setState] = useState<LikeState>({ liked, count });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle() {
    const before = state;
    const want = !before.liked;
    setError(null);
    setState(applyLike(before, want));
    start(async () => {
      try {
        const res = await likeWork(itemId, want);
        if (res.ok) setState({ liked: res.liked, count: res.count });
        else {
          setState(before);
          setError(MESSAGES[res.reason]);
        }
      } catch {
        setState(before);
        setError(MESSAGES.network);
      }
    });
  }

  return (
    <div className={cn("relative z-10 flex flex-wrap items-center gap-x-1", className)}>
      {signedIn ? (
        <button type="button" onClick={toggle} aria-pressed={state.liked} aria-busy={pending} aria-label="Mi piace" className={control}>
          <Heart className={cn("size-6", state.liked && "fill-primary text-primary")} aria-hidden />
        </button>
      ) : (
        <Link href={loginHref} aria-label="Accedi per mettere mi piace" className={control}>
          <Heart className="size-6" aria-hidden />
        </Link>
      )}
      <span className="text-body-s font-semibold" aria-live="polite">
        {likesLabel(state.count)}
      </span>
      {error && (
        <p role="alert" className="basis-full pl-3 text-caption text-error">
          {error}
        </p>
      )}
    </div>
  );
}
