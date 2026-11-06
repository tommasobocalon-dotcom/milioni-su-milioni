import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copia il web worker di MapLibre in public/, così viene servito come file statico.
 * Turbopack non riscrive l'URL del worker (new Worker(new URL(..., import.meta.url))): senza questo file
 * la mappa dei risultati dà "Worker failed to load". results-map.tsx lo carica con setWorkerUrl.
 * Gira a ogni dev/build (predev, prebuild), così resta allineato alla versione del pacchetto.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const dest = join(root, "public/maplibre-gl-worker.mjs");
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("[maplibre] worker copiato in public/maplibre-gl-worker.mjs");
