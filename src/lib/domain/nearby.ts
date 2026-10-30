/**
 * "Vicino a te" (pagina /vicino-a-te): raggio di ricerca, posizione della persona e radar dei partner.
 * Le distanze si calcolano in TypeScript (distanceKm in format.ts), senza PostGIS.
 */
import { distanceKm } from "./format";

export const RADII_KM = [5, 10, 25, 50] as const;
export const DEFAULT_RADIUS_KM = 10;

export function parseRadius(raw: string | undefined): number {
  const value = Number(raw);
  return (RADII_KM as readonly number[]).includes(value) ? value : DEFAULT_RADIUS_KM;
}

type Point = { lat: number; lng: number };

/**
 * Posizione arrivata dal browser. Arrotondata a due decimali (circa un chilometro): basta per le distanze
 * e la posizione esatta non arriva mai al server.
 */
export function parseCoords(rawLat: string | undefined, rawLng: string | undefined): Point | null {
  if (!rawLat || !rawLng) return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat: roundCoord(lat), lng: roundCoord(lng) };
}

export function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Direzione della bussola da a verso b: 0 = nord, 90 = est. */
export function bearingDeg(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Punto sul radar (0–1, centro 0,5; nord in alto). Oltre il raggio resta sul bordo.
 * La distanza dal centro cresce con la radice dei km: i vicinissimi non si ammucchiano al centro, e gli anelli
 * del radar riportano i km veri (radarRingKm).
 */
export function radarPoint(km: number, bearing: number, radiusKm: number): { x: number; y: number } {
  const r = Math.sqrt(Math.min(1, km / radiusKm)) * 0.5;
  const th = (bearing * Math.PI) / 180;
  return { x: 0.5 + r * Math.sin(th), y: 0.5 - r * Math.cos(th) };
}

/** Km di un anello del radar che sta alla frazione f (0–1) del raggio disegnato. */
export function radarRingKm(f: number, radiusKm: number): number {
  return f * f * radiusKm;
}

export function nearestPlace<T extends Point>(point: Point, places: T[]): T | null {
  let best: T | null = null;
  let bestKm = Infinity;
  for (const p of places) {
    const km = distanceKm(point, p);
    if (km < bestKm) {
      best = p;
      bestKm = km;
    }
  }
  return best;
}
