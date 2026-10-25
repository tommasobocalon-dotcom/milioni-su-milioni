/**
 * Stacca la lente d'ingrandimento (con la mano che la regge) dal corpo della posa "recensioni".
 *
 * Va lanciato dopo split_parti.py, che ha già tolto la stella: parte da parti/geco-recensioni-corpo.png
 * e lo riscrive senza lente, salvando la lente in parti/geco-recensioni-lente.png.
 * La zona coperta dalla lente viene ricostruita (inpainting "a cipolla": ogni pixel mancante prende la
 * media dei vicini già noti), così quando la lente si sposta non si vede un buco.
 * Il disco sul polso resta sia nel corpo sia nella lente: ruotando attorno al perno la giuntura non si apre.
 *
 * Uso: node design/geco/split_lente.mjs  (dalla cartella del progetto; usa sharp di Next)
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = dirname(fileURLToPath(import.meta.url));
const OUT = join(BASE, "parti");
const N = 768;

// Coordinate in pixel sull'immagine 768×768.
const LENS = { cx: 367, cy: 144, r: 131 };
const HANDLE_AND_HAND = [
  [298, 262], [346, 262], [340, 300], [335, 322], [328, 345], [327, 415], [300, 426], [268, 426],
  [270, 472], [226, 472], [228, 438], [238, 360], [250, 322], [292, 316],
];
const PIVOT = { x: 336, y: 380, r: 26 };

async function mask(svgBody) {
  const svg = `<svg width="${N}" height="${N}" xmlns="http://www.w3.org/2000/svg">${svgBody}</svg>`;
  const { data } = await sharp(Buffer.from(svg)).blur(1.2).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  return data;
}

function inpaint(px, region) {
  const known = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) known[i] = region[i] ? 0 : 1;
  let todo = region.reduce((n, v) => n + (v ? 1 : 0), 0);
  while (todo > 0) {
    const ring = [];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        if (known[i]) continue;
        const acc = [0, 0, 0, 0];
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
            const j = yy * N + xx;
            if (!known[j]) continue;
            for (let c = 0; c < 4; c++) acc[c] += px[j * 4 + c];
            n++;
          }
        if (n) ring.push([i, acc.map((v) => v / n)]);
      }
    if (!ring.length) break;
    for (const [i, v] of ring) {
      for (let c = 0; c < 4; c++) px[i * 4 + c] = Math.round(v[c]);
      known[i] = 1;
    }
    todo -= ring.length;
  }
}

const src = join(OUT, "geco-recensioni-corpo.png");
const { data: px } = await sharp(readFileSync(src)).ensureAlpha().resize(N, N).raw().toBuffer({ resolveWithObject: true });

const pts = HANDLE_AND_HAND.map(([x, y]) => `${x},${y}`).join(" ");
const partMask = await mask(
  `<circle cx="${LENS.cx}" cy="${LENS.cy}" r="${LENS.r}" fill="#fff"/><polygon points="${pts}" fill="#fff"/>`,
);
const discMask = await mask(`<circle cx="${PIVOT.x}" cy="${PIVOT.y}" r="${PIVOT.r}" fill="#fff"/>`);

const part = Buffer.from(px);
for (let i = 0; i < N * N; i++) part[i * 4 + 3] = Math.round((px[i * 4 + 3] * Math.max(partMask[i], discMask[i])) / 255);

// Zona da ricostruire nel corpo: la lente con un margine, tranne il disco del perno.
const region = new Uint8Array(N * N);
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) {
    const i = y * N + x;
    let hit = false;
    for (let d = -3; d <= 3 && !hit; d += 3)
      for (let e = -3; e <= 3 && !hit; e += 3) {
        const xx = Math.min(N - 1, Math.max(0, x + d)), yy = Math.min(N - 1, Math.max(0, y + e));
        if (partMask[yy * N + xx] > 8) hit = true;
      }
    region[i] = hit && discMask[i] < 128 ? 1 : 0;
  }
const body = Buffer.from(px);
inpaint(body, region);
// L'inpainting a cipolla lascia striature: dentro la zona ricostruita si usa una versione sfocata.
const { data: soft } = await sharp(body, { raw: { width: N, height: N, channels: 4 } }).blur(7).raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < N * N; i++) if (region[i]) for (let c = 0; c < 4; c++) body[i * 4 + c] = soft[i * 4 + c];

const opts = { raw: { width: N, height: N, channels: 4 } };
await sharp(part, opts).png().toFile(join(OUT, "geco-recensioni-lente.png"));
await sharp(body, opts).png().toFile(src);

const pivots = JSON.parse(readFileSync(join(OUT, "pivot.json"), "utf8"));
pivots.recensioni.lente = { pivot: [+(PIVOT.x / N).toFixed(3), +(PIVOT.y / N).toFixed(3)] };
writeFileSync(join(OUT, "pivot.json"), JSON.stringify(pivots, null, 2));
console.log("ok: geco-recensioni-lente.png, geco-recensioni-corpo.png, pivot.json");
