import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Content-Security-Policy: in sviluppo servono eval e websocket per l'hot reload di Next/React.
const isDev = process.env.NODE_ENV !== "production";
// Indirizzi da cui Google Ads (gtag) e Meta caricano script, mandano le conversioni e aprono iframe di misurazione.
const ADS_HOSTS = {
  script: "https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://connect.facebook.net",
  connect:
    "https://www.googletagmanager.com https://www.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://*.google-analytics.com https://*.analytics.google.com https://www.facebook.com https://connect.facebook.net",
  frame: "https://td.doubleclick.net https://www.googletagmanager.com https://www.facebook.com",
};
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
  // Google Ads e pixel di Meta: caricati solo dopo "Accetta" nel banner dei cookie (components/site/consent.tsx).
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com ${ADS_HOSTS.script}${isDev ? " 'unsafe-eval'" : ""}`,
  `frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://player.vimeo.com ${ADS_HOSTS.frame}`,
  // MapLibre gira in un web worker creato da un blob.
  "worker-src 'self' blob:",
  // Turnstile + tile di OpenStreetMap (mappa dei risultati).
  // Sentry (regione UE): errori del browser.
  `connect-src 'self' https://challenges.cloudflare.com https://tile.openstreetmap.org https://*.ingest.de.sentry.io ${ADS_HOSTS.connect}${isDev ? " ws:" : ""}`,
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
  // 8 foto di un progetto, ridotte nel browser (PortfolioForm): stanno sotto il limite di 4,5 MB delle richieste su Vercel.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
  // La pagina dei pacchetti si chiamava "token" finché si pagava a crediti (tolti l'11/11/2026).
  async redirects() {
    return [{ source: "/area-partner/token", destination: "/area-partner/sponsorizzazioni", permanent: true }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Video e poster della hero restano nel browser per un anno: per cambiarli si usa un nome di file nuovo.
      { source: "/hero/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

// Sentry: con SENTRY_AUTH_TOKEN (e SENTRY_ORG, SENTRY_PROJECT) la build carica le source map, così gli errori del
// browser mostrano il codice vero e non quello compresso. Senza, la build resta uguale e gli errori arrivano lo stesso.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
  silent: !process.env.CI,
  telemetry: false,
});
