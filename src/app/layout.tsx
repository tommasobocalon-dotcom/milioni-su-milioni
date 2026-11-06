import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const manrope = localFont({
  variable: "--font-manrope",
  src: "./fonts/manrope-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
});
const inter = localFont({
  variable: "--font-inter",
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "GecoItalia — Casa e lavori di casa in Veneto", template: "%s · GecoItalia" },
  description:
    "Confronta agenzie immobiliari, tecnici e artigiani verificati della tua zona. Richiedi un contatto in pochi minuti, con prezzi indicativi e recensioni verificate.",
};

export const viewport: Viewport = {
  themeColor: "#1f3a2b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${manrope.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
