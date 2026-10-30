import type { Metadata, Viewport } from "next";

/**
 * Il gestionale come app a sé: indirizzo proprio (ADMIN_URL, vedi src/proxy.ts) e installabile su
 * computer e telefono (manifest in public/gestionale).
 */
export const metadata: Metadata = {
  title: { default: "Gestionale", template: "%s · Gestionale geco" },
  robots: { index: false },
  applicationName: "Gestionale geco",
  manifest: "/gestionale/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Gestionale", statusBarStyle: "default" },
  icons: { apple: "/gestionale/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#1F3A2B" };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
