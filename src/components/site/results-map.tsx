"use client";

import { useEffect, useRef } from "react";
import { LngLatBounds, Map as MaplibreMap, Marker, NavigationControl, Popup, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Turbopack non riscrive l'URL del worker di MapLibre: lo serviamo come file statico (copiato in public da
// scripts/copy-maplibre-worker.mjs, allineato alla versione del pacchetto a ogni build).
setWorkerUrl("/maplibre-gl-worker.mjs");

export type MapPoint = { id: string; name: string; href: string; lat: number; lng: number };

/** Stile raster con i tile di OpenStreetMap: nessuna chiave. In produzione serve un provider di tile proprio. */
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Mappa dei risultati di ricerca (PRD §5.2): un marker per partner, con nome e link alla scheda.
 * La vista si adatta ai marker; con un marker solo si centra su di esso.
 */
export function ResultsMap({ points }: { points: MapPoint[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || points.length === 0) return;
    const map = new MaplibreMap({
      container: container.current,
      style: OSM_STYLE,
      center: [points[0].lng, points[0].lat],
      zoom: 10,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    // Lo zoom con la rotella parte spento, così scorrere la pagina sopra la mappa non la ingrandisce.
    // Si accende al clic dentro la mappa e si rispegne quando il cursore esce.
    map.scrollZoom.disable();
    map.on("click", () => map.scrollZoom.enable());
    container.current.addEventListener("mouseleave", () => map.scrollZoom.disable());

    const bounds = new LngLatBounds();
    for (const p of points) {
      const popup = new Popup({ offset: 24, closeButton: false }).setHTML(
        `<a href="${esc(p.href)}" class="font-semibold text-primary underline">${esc(p.name)}</a>`,
      );
      new Marker({ color: "#1f3a2b" }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
      bounds.extend([p.lng, p.lat]);
    }
    if (points.length > 1) map.fitBounds(bounds, { padding: 48, maxZoom: 14 });

    return () => map.remove();
  }, [points]);

  if (points.length === 0) return null;
  return <div ref={container} className="h-72 w-full overflow-hidden rounded-lg border border-line md:h-80" aria-label="Mappa dei risultati" />;
}
