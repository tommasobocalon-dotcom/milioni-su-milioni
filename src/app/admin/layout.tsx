import type { Metadata, Viewport } from "next";

/**
 * Il gestionale come app a sé: indirizzo proprio (ADMIN_URL, vedi src/proxy.ts) e installabile su
 * computer e telefono (manifest in public/gestionale).
 */
export const metadata: Metadata = {
  title: { default: "Gestionale", template: "%s · Gestionale GecoItalia" },
  robots: { index: false },
  applicationName: "Gestionale GecoItalia",
  manifest: "/gestionale/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Gestionale", statusBarStyle: "default" },
  icons: { apple: "/gestionale/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#243e36" };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
