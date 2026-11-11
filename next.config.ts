import type { NextConfig } from "next";

// Content-Security-Policy: in sviluppo servono eval e websocket per l'hot reload di Next/React.
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Le foto possono arrivare dal disco locale (/uploads) o da uno storage esterno (Supabase) via https.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Tailwind e Next iniettano stili inline: senza nonce 'unsafe-inline' evita di rompere la UI.
  "style-src 'self' 'unsafe-inline'",
  // Cloudflare Turnstile (antispam): script e iframe del widget, verifica dal browser.
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://player.vimeo.com",
  // MapLibre gira in un web worker creato da un blob.
  "worker-src 'self' blob:",
  // Turnstile + tile di OpenStreetMap (mappa dei risultati).
  `connect-src 'self' https://challenges.cloudflare.com https://tile.openstreetmap.org${isDev ? " ws:" : ""}`,
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS: i browser lo applicano solo su HTTPS (ignorato su localhost http).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Cartella propria per il server dei test end-to-end, così gira accanto a `npm run dev` (playwright.config.ts).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Per provare in locale sito e gestionale su due indirizzi (src/proxy.ts) servono due nomi diversi da
  // "localhost": APP_URL=http://sito.localhost:3000 e ADMIN_URL=http://admin.localhost:3000.
  allowedDevOrigins: ["sito.localhost", "admin.localhost"],
  cacheComponents: true,
  partialPrefetching: true,
  // Foto profilo fino a 2 MB più il margine del multipart.
  experimental: { serverActions: { bodySizeLimit: "2.1mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Video e poster della hero restano nel browser per un anno: per cambiarli si usa un nome di file nuovo.
      { source: "/hero/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
