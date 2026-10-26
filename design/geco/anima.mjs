/**
 * Anima le pose del geco che muovono un braccio, senza staccarlo dal corpo.
 *
 * Invece di ruotare un pezzo rigido sopra il corpo (la giuntura si apriva), ogni fotogramma deforma
 * l'immagine intera: un peso w (0 sul corpo, 1 sulla parte che si muove, sfumato sulla giuntura) dice di
 * quanto ruota ogni punto attorno al perno, così il braccio si piega come un braccio vero.
 * Dove la parte si allontana da quello che copriva si usa "dietro": il corpo ricostruito da split_lente.mjs,
 * oppure (riempi) la zona della mano riempita colonna per colonna con la pancia che sta sopra e sotto. I fotogrammi finiscono in un WebP animato (public/geco/anim/<posa>.webp) più un fermo
 * immagine per "riduci movimento" (<posa>-fermo.webp).
 *
 * Uso: node design/geco/anima.mjs [posa] [--prove]   (dalla cartella del progetto; usa sharp di Next)
 *   --prove salva in design/geco/prove/ i fotogrammi agli angoli estremi per controllarli.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = dirname(fileURLToPath(import.meta.url));
const OUT = join(BASE, "../../public/geco/anim");
const PROVE = join(BASE, "prove");
const R = 512; // lato su cui si calcola la deformazione; il file esce a "lato" (il doppio della misura più grande usata nel sito)
const FPS = 20;

/*
 * Coordinate 0–1. Ogni zona: mask (SVG nel riquadro 0–1, bianco = parte che si muove), blur (bordo
 * sfumato, in px su 512), giuntura (from → to: w passa da 0 a 1 lungo questo tratto), perno, chiavi
 * [tempo 0–1, gradi] con ease-in-out tra una chiave e l'altra, rigida (SVG di ciò che ruota per intero, senza
 * giuntura), dietro (corpo ricostruito da usare dove la parte se ne va) o riempi (SVG della zona da ricostruire).
 */
const POSES = {
  saluto: {
    lato: 520,
    src: "scontornati/geco-v2-saluto.png",
    // dietro il braccio c'è il petto/spalla: lo ricostruiamo, così alzando il braccio non si apre un vuoto
    riempi: poly([0.6, 0.48], [0.78, 0.48], [0.78, 0.7], [0.6, 0.7]),
    durata: 3.2,
    zone: [
      {
        mask: poly([0.72, 0.235], [0.98, 0.2], [0.99, 0.68], [0.78, 0.68], [0.7, 0.53], [0.665, 0.47], [0.665, 0.33]),
        blur: 2,
        giuntura: { from: [0.66, 0.565], to: [0.735, 0.5] },
        perno: [0.71, 0.545],
        chiavi: [[0, 0], [0.12, -7], [0.24, 5], [0.36, -7], [0.48, 5], [0.6, 0], [1, 0]],
      },
    ],
  },
  casa: {
    lato: 300,
    src: "scontornati/geco-posa-casa.png",
    durata: 2.8,
    zone: [
      {
        mask: poly([0.05, 0.26], [0.33, 0.27], [0.36, 0.36], [0.36, 0.47], [0.26, 0.48], [0.25, 0.63], [0.05, 0.63]),
        blur: 2,
        giuntura: { from: [0.36, 0.4], to: [0.28, 0.4] },
        perno: [0.33, 0.405],
        chiavi: [[0, 0], [0.15, -4], [0.3, 3], [0.45, -2], [0.6, 0], [1, 0]],
      },
    ],
  },
  professionista: {
    lato: 300,
    src: "scontornati/geco-posa-professionista.png",
    durata: 1.8,
    zone: [
      {
        mask: poly([0, 0.27], [0.218, 0.27], [0.218, 0.42], [0.32, 0.46], [0.32, 0.62], [0.2, 0.665], [0, 0.665]),
        blur: 2,
        giuntura: { from: [0.31, 0.55], to: [0.22, 0.53] },
        perno: [0.29, 0.545],
        chiavi: [[0, 0], [0.4, 5], [0.55, -7], [0.65, -5], [0.85, 0], [1, 0]],
      },
    ],
  },
  partner: {
    lato: 440,
    src: "scontornati/geco-posa-partner.png",
    riempi: poly([0.35, 0.49], [0.63, 0.49], [0.63, 0.655], [0.415, 0.655], [0.415, 0.56], [0.35, 0.56]),
    durata: 3,
    zone: [
      {
        // sagoma della mano: dietro ci sono pancia e tablet, che restano fermi
        mask: poly([0.355, 0.503], [0.47, 0.493], [0.52, 0.498], [0.56, 0.515], [0.62, 0.515], [0.62, 0.645], [0.47, 0.645], [0.428, 0.628], [0.424, 0.548], [0.355, 0.546]),
        blur: 1.5,
        giuntura: { from: [0.62, 0.57], to: [0.54, 0.57] },
        // perno sulla punta del dito: resta sul tablet e si muove il pugno, come un tocco sullo schermo
        perno: [0.36, 0.524],
        chiavi: [[0, 0], [0.2, -4], [0.3, 0], [0.45, -4], [0.6, 0], [1, 0]],
      },
    ],
  },
  recensioni: {
    lato: 192,
    fps: 12, // piccola (96 px) e lenta: bastano meno fotogrammi, e il file resta leggero
    src: "scontornati/geco-posa-recensioni.png",
    dietro: "parti/geco-recensioni-corpo.png",
    durata: 3.6,
    zone: [
      {
        // stella con la mano che la regge: piega al gomito
        mask: poly([0.7, 0.33], [1, 0.33], [1, 0.6], [0.72, 0.62], [0.69, 0.56], [0.68, 0.46]),
        blur: 2,
        giuntura: { from: [0.68, 0.53], to: [0.76, 0.53] },
        perno: [0.71, 0.53],
        chiavi: [[0, 0], [0.5, -5], [1, 0]],
        senza_dietro: true,
      },
      {
        // lente con la mano: il vetro ruota per intero, la piega è al polso
        rigida:
          `<circle cx="${367 / 768}" cy="${144 / 768}" r="${133 / 768}"/>` +
          poly([0.42, 0.3], [0.455, 0.33], [0.4, 0.45], [0.36, 0.43]),
        mask:
          poly(...[[298, 262], [346, 262], [340, 300], [335, 322], [328, 345], [327, 415], [300, 426], [268, 426],
            [270, 472], [226, 472], [228, 438], [238, 360], [250, 322], [292, 316]].map(([x, y]) => [x / 768, y / 768])) +
          poly([0.42, 0.44], [0.49, 0.42], [0.5, 0.56], [0.42, 0.56]),
        blur: 1.5,
        giuntura: { from: [0.49, 0.5], to: [0.43, 0.5] },
        perno: [0.438, 0.495],
        chiavi: [[0, 0], [0.25, -4], [0.5, 0], [0.75, 3], [1, 0]],
      },
    ],
  },
};

function poly(...pts) {
  return `<polygon points="${pts.map(([x, y]) => `${x},${y}`).join(" ")}"/>`;
}

async function load(file) {
  const { data } = await sharp(join(BASE, file)).ensureAlpha().resize(R, R).raw().toBuffer({ resolveWithObject: true });
  // premoltiplicato in float, così il campionamento bilineare non fa aloni sui bordi
  const px = new Float32Array(R * R * 4);
  for (let i = 0; i < R * R; i++) {
    const a = data[i * 4 + 3] / 255;
    px[i * 4] = data[i * 4] * a;
    px[i * 4 + 1] = data[i * 4 + 1] * a;
    px[i * 4 + 2] = data[i * 4 + 2] * a;
    px[i * 4 + 3] = a;
  }
  return px;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

async function weights(zone) {
  const data = await raster(zone.mask, zone.blur);
  const rigid = zone.rigida ? await raster(zone.rigida, zone.blur) : null;
  const w = new Float32Array(R * R);
  const [fx, fy] = zone.giuntura.from, [tx, ty] = zone.giuntura.to;
  const dx = tx - fx, dy = ty - fy, len2 = dx * dx + dy * dy;
  for (let y = 0; y < R; y++)
    for (let x = 0; x < R; x++) {
      const i = y * R + x;
      const u = ((x / R - fx) * dx + (y / R - fy) * dy) / len2;
      let v = (data[i] / 255) * smooth(0, 1, u);
      w[i] = rigid ? Math.max(v, rigid[i] / 255) : v;
    }
  return w;
}

async function raster(shapes, blur) {
  const svg = `<svg width="${R}" height="${R}" viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg"><g fill="#fff">${shapes}</g></svg>`;
  const { data } = await sharp({ create: { width: R, height: R, channels: 3, background: "#000" } })
    .composite([{ input: Buffer.from(svg) }])
    .blur(blur)
    .extractChannel(0)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

/** Ricostruisce la zona interpolando in verticale tra il primo pixel sopra e il primo sotto fuori zona. */
function fill(px, region) {
  const out = Float32Array.from(px);
  for (let x = 0; x < R; x++)
    for (let y = 0; y < R; y++) {
      if (!region[y * R + x]) continue;
      let y1 = y;
      while (y1 < R && region[y1 * R + x]) y1++;
      const top = Math.max(0, y - 1), bottom = Math.min(R - 1, y1);
      for (let yy = y; yy < y1; yy++) {
        const t = (yy - top) / (bottom - top);
        for (let c = 0; c < 4; c++)
          out[(yy * R + x) * 4 + c] = px[(top * R + x) * 4 + c] * (1 - t) + px[(bottom * R + x) * 4 + c] * t;
      }
      y = y1;
    }
  return out;
}

function sample(px, x, y, out) {
  out[0] = out[1] = out[2] = out[3] = 0;
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  for (let k = 0; k < 4; k++) {
    const xx = x0 + (k & 1), yy = y0 + (k >> 1);
    if (xx < 0 || yy < 0 || xx >= R || yy >= R) continue;
    const f = (k & 1 ? fx : 1 - fx) * (k >> 1 ? fy : 1 - fy), j = (yy * R + xx) * 4;
    out[0] += px[j] * f; out[1] += px[j + 1] * f; out[2] += px[j + 2] * f; out[3] += px[j + 3] * f;
  }
  return out;
}

function wAt(w, x, y) {
  const xi = Math.min(R - 1, Math.max(0, Math.round(x))), yi = Math.min(R - 1, Math.max(0, Math.round(y)));
  return w[yi * R + xi];
}

/** Ruota di deg (senso orario, come CSS rotate) attorno al perno, pesato da w. */
function warp(px, back, w, perno, deg) {
  if (!deg) return px;
  const out = new Float32Array(R * R * 4);
  const cx = perno[0] * R, cy = perno[1] * R, th = (-deg * Math.PI) / 180;
  const a = [0, 0, 0, 0], b = [0, 0, 0, 0];
  for (let y = 0; y < R; y++)
    for (let x = 0; x < R; x++) {
      const vx = x - cx, vy = y - cy;
      // da dove arriva il pixel: punto fisso q = perno + rot(-deg·w(q)) (p - perno)
      let qx = x, qy = y;
      for (let k = 0; k < 8; k++) {
        const t = th * wAt(w, qx, qy), c = Math.cos(t), s = Math.sin(t);
        qx = cx + c * vx - s * vy;
        qy = cy + s * vx + c * vy;
      }
      const t = th * wAt(w, qx, qy), c = Math.cos(t), s = Math.sin(t);
      const err = Math.hypot(cx + c * vx - s * vy - qx, cy + s * vx + c * vy - qy);
      // il punto fisso non esiste dove la parte se n'è andata: lì si vede quello che c'era dietro
      if (err > 0.75) {
        if (back) sample(back, x, y, a);
        else a[0] = a[1] = a[2] = a[3] = 0;
      } else sample(px, qx, qy, a);
      // la parte ruotata per intero sta sempre davanti (copre ciò su cui passa)
      const c1 = Math.cos(th), s1 = Math.sin(th);
      const rx = cx + c1 * vx - s1 * vy, ry = cy + s1 * vx + c1 * vy;
      const f = smooth(0.55, 0.95, wAt(w, rx, ry));
      if (f > 0) {
        sample(px, rx, ry, b);
        const k = f * b[3];
        for (let i = 0; i < 4; i++) a[i] = b[i] * f + a[i] * (1 - k);
      }
      out.set(a, (y * R + x) * 4);
    }
  return out;
}

async function shrink(rgba, lato) {
  return sharp(rgba, { raw: { width: R, height: R, channels: 4 } }).resize(lato, lato).raw().toBuffer();
}

function toRgba(px) {
  const o = Buffer.alloc(R * R * 4);
  for (let i = 0; i < R * R; i++) {
    const a = px[i * 4 + 3];
    if (a <= 0) continue;
    o[i * 4] = Math.round(Math.min(255, px[i * 4] / a));
    o[i * 4 + 1] = Math.round(Math.min(255, px[i * 4 + 1] / a));
    o[i * 4 + 2] = Math.round(Math.min(255, px[i * 4 + 2] / a));
    o[i * 4 + 3] = Math.round(Math.min(1, a) * 255);
  }
  return o;
}

// ease-in-out di CSS: cubic-bezier(0.42, 0, 0.58, 1)
function ease(t) {
  const bx = (u) => 3 * (1 - u) * (1 - u) * u * 0.42 + 3 * (1 - u) * u * u * 0.58 + u * u * u;
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (bx(m) < t) lo = m;
    else hi = m;
  }
  const u = (lo + hi) / 2;
  return 3 * (1 - u) * u * u + u * u * u;
}

function angle(chiavi, t) {
  for (let i = 1; i < chiavi.length; i++) {
    const [t0, a0] = chiavi[i - 1], [t1, a1] = chiavi[i];
    if (t <= t1) return a0 + (a1 - a0) * ease((t - t0) / (t1 - t0));
  }
  return chiavi.at(-1)[1];
}

async function render(name, pose, prove) {
  const src = await load(pose.src);
  const back = pose.dietro ? await load(pose.dietro) : pose.riempi ? fill(src, await raster(pose.riempi, 0.3)) : null;
  const ws = [];
  for (const z of pose.zone) ws.push(await weights(z));
  const frame = (angles) =>
    pose.zone.reduce((px, z, i) => warp(px, z.senza_dietro ? null : back, ws[i], z.perno, angles[i]), src);

  if (prove) {
    mkdirSync(PROVE, { recursive: true });
    const extremes = pose.zone.map((z) => [Math.min(...z.chiavi.map((c) => c[1])), Math.max(...z.chiavi.map((c) => c[1]))]);
    for (const [i, pick] of [[0, 0], [1, 1]]) {
      const px = frame(extremes.map((e) => e[pick]));
      await sharp(toRgba(px), { raw: { width: R, height: R, channels: 4 } }).png().toFile(join(PROVE, `${name}-${i}.png`));
    }
    const wimg = Buffer.alloc(R * R);
    ws.forEach((w) => w.forEach((v, i) => (wimg[i] = Math.max(wimg[i], Math.round(v * 255)))));
    await sharp(wimg, { raw: { width: R, height: R, channels: 1 } }).png().toFile(join(PROVE, `${name}-w.png`));
    return;
  }

  // fotogrammi a FPS fissi; quelli uguali al precedente (le pause) allungano la durata invece di ripetersi
  const fps = pose.fps ?? FPS;
  const n = Math.round(pose.durata * fps);
  const frames = [], delay = [];
  let last = null;
  for (let f = 0; f < n; f++) {
    const angles = pose.zone.map((z) => Math.round(angle(z.chiavi, f / n) * 20) / 20);
    const key = angles.join();
    if (key === last) {
      delay[delay.length - 1] += 1000 / fps;
      continue;
    }
    last = key;
    frames.push(await shrink(toRgba(frame(angles)), pose.lato));
    delay.push(1000 / fps);
  }
  mkdirSync(OUT, { recursive: true });
  await sharp(Buffer.concat(frames), { raw: { width: pose.lato, height: pose.lato * frames.length, channels: 4, pageHeight: pose.lato } })
    .webp({ quality: 75, alphaQuality: 80, effort: 6, minSize: true, loop: 0, delay: delay.map(Math.round) })
    .toFile(join(OUT, `${name}.webp`));
  await sharp(await shrink(toRgba(src), pose.lato), { raw: { width: pose.lato, height: pose.lato, channels: 4 } })
    .webp({ quality: 80, alphaQuality: 90, effort: 6 })
    .toFile(join(OUT, `${name}-fermo.webp`));
  console.log(name, frames.length, "fotogrammi");
}

const args = process.argv.slice(2);
const prove = args.includes("--prove");
const only = args.find((a) => !a.startsWith("--"));
for (const [name, pose] of Object.entries(POSES)) if (!only || only === name) await render(name, pose, prove);
