import { safeNextPath } from "./format";

/**
 * "Mi piace" sui lavori di Ispirazione (13/11/2026): uno per account e per lavoro, li mettono clienti e aziende
 * che hanno fatto l'accesso. Non sono recensioni né voti: contano solo quanti hanno apprezzato il lavoro.
 */
export type LikeState = { liked: boolean; count: number };

const number = new Intl.NumberFormat("it-IT");

/** Testo del conto, anche per chi usa uno screen reader. */
export function likesLabel(count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  return n === 0 ? "Ancora nessun mi piace" : `${number.format(n)} mi piace`;
}

/** Stato dopo la scelta di chi guarda: ripetere la stessa scelta non cambia nulla, il conto non va sotto zero. */
export function applyLike(state: LikeState, liked: boolean): LikeState {
  if (state.liked === liked) return state;
  return { liked, count: Math.max(0, state.count + (liked ? 1 : -1)) };
}

/** Chi non ha fatto l'accesso passa da qui e poi torna alla pagina da cui è partito. */
export function likeLoginHref(path: string): string {
  return `/accedi?next=${encodeURIComponent(safeNextPath(path) ?? "/ispirazione")}`;
}
