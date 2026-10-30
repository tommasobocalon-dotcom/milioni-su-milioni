import type { NearbyPartner } from "@/lib/data/nearby";
import { formatDistanceKm } from "@/lib/domain/format";
import { radarPoint, radarRingKm } from "@/lib/domain/nearby";

const SIZE = 400;
const C = SIZE / 2;
const R = 176;
/** Un giro della scia del radar, in secondi: ogni punto si accende quando la scia ci passa sopra. */
const TURN = 4;
const DOT = 12;

/**
 * Radar dei partner intorno a un punto: nord in alto, distanza dal centro in scala con il raggio scelto.
 * I numeri sui punti sono quelli dell'elenco che sta sotto (l'elenco è il contenuto vero, il radar lo mostra).
 */
export function Radar({ partners, radiusKm, centerLabel }: { partners: NearbyPartner[]; radiusKm: number; centerLabel: string }) {
  const placed: { x: number; y: number }[] = [];
  const dots = partners.map((p, i) => {
    let bearing = p.bearing;
    let km = Math.max(p.distanceKm, radiusKm * 0.02);
    let pos = toSvg(radarPoint(km, bearing, radiusKm));
    // Partner nello stesso paese: si spostano un poco attorno al centro invece di coprirsi.
    for (let k = 0; k < 24 && placed.some((q) => Math.hypot(q.x - pos.x, q.y - pos.y) < DOT * 2 + 2); k++) {
      bearing += 17;
      if (k % 6 === 5) km = Math.min(radiusKm, km + radiusKm * 0.05);
      pos = toSvg(radarPoint(km, bearing, radiusKm));
    }
    placed.push(pos);
    return { p, i, pos, delay: ((((bearing % 360) + 360) % 360) / 360) * TURN };
  });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`Radar: ${partners.length} ${partners.length === 1 ? "azienda" : "aziende"} entro ${radiusKm} km da ${centerLabel}. L'elenco è sotto.`}
      className="h-auto w-full select-none"
    >
      <circle cx={C} cy={C} r={R} fill="var(--color-subtle)" />
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle key={f} cx={C} cy={C} r={R * f} fill="none" stroke="var(--color-salvia-300)" strokeWidth={1} />
      ))}
      {[0.5, 1].map((f) => (
        <text key={f} x={C + 6} y={C - R * f + 14} fontSize={11} fill="var(--color-neutro-600)">
          {formatDistanceKm(radarRingKm(f, radiusKm))}
        </text>
      ))}
      <text x={C} y={C - R - 8} fontSize={12} fontWeight={700} textAnchor="middle" fill="var(--color-neutro-600)">
        N
      </text>

      {/* Scia del radar: tre giri, poi si ferma a nord. */}
      <g className="radar-scia">
        <path
          d={`M${C} ${C} L${C + R * Math.sin(-Math.PI / 6)} ${C - R * Math.cos(-Math.PI / 6)} A${R} ${R} 0 0 1 ${C} ${C - R} Z`}
          fill="var(--color-primary)"
          opacity={0.1}
        />
        <line x1={C} y1={C} x2={C} y2={C - R} stroke="var(--color-primary)" strokeWidth={2} strokeLinecap="round" />
      </g>

      <circle className="radar-onda" cx={C} cy={C} r={40} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      <circle cx={C} cy={C} r={8} fill="var(--color-ambra-500)" stroke="#fff" strokeWidth={2} />

      {dots.map(({ p, i, pos, delay }) => (
        <a key={p.id} href={p.href} tabIndex={-1} aria-hidden="true">
          <g className="radar-punto" style={{ "--ritardo": `${delay}s` } as React.CSSProperties}>
            <title>{`${p.displayName} · ${p.categoryName} · ${formatDistanceKm(p.distanceKm)}`}</title>
            <circle cx={pos.x} cy={pos.y} r={DOT} fill="var(--color-primary)" stroke="#fff" strokeWidth={2} />
            <text x={pos.x} y={pos.y} fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill="#fff">
              {i + 1}
            </text>
          </g>
        </a>
      ))}
    </svg>
  );
}

function toSvg(pt: { x: number; y: number }) {
  return { x: C + (pt.x - 0.5) * 2 * R, y: C + (pt.y - 0.5) * 2 * R };
}
