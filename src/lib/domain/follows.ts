import { safeNextPath } from "./format";

/**
 * "Segui" sulle aziende (13/11/2026): clienti e aziende che hanno fatto l'accesso seguono le aziende di cui vogliono
 * vedere i nuovi lavori nella scheda "Seguiti" di Ispirazione. Uno per account e per azienda; il conto è pubblico.
 */
export type FollowState = { following: boolean; count: number };

const number = new Intl.NumberFormat("it-IT");

/** Testo del conto dei follower, anche per chi usa uno screen reader. */
export function followersLabel(count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  return n === 0 ? "Ancora nessun follower" : `${number.format(n)} follower`;
}

/** Stato dopo la scelta di chi guarda: ripetere la stessa scelta non cambia nulla, il conto non va sotto zero. */
export function applyFollow(state: FollowState, following: boolean): FollowState {
  if (state.following === following) return state;
  return { following, count: Math.max(0, state.count + (following ? 1 : -1)) };
}

/** Chi non ha fatto l'accesso passa da qui e poi torna alla pagina da cui è partito. */
export function followLoginHref(path: string): string {
  return `/accedi?next=${encodeURIComponent(safeNextPath(path) ?? "/ispirazione")}`;
}
