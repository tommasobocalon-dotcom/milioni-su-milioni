import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { WelcomeOverlay, WelcomeTransition } from "@/components/site/welcome";
import { WELCOME_HEAD_SCRIPT } from "@/lib/auth/welcome";
import "./globals.css";

const fraunces = localFont({
  variable: "--font-fraunces",
  src: "./fonts/fraunces-latin-600-normal.woff2",
  weight: "600",
  display: "swap",
});
const dmSans = localFont({
  variable: "--font-dm-sans",
  src: "./fonts/dm-sans-latin-wght-normal.woff2",
  weight: "100 1000",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "geco — Casa e lavori di casa in Veneto", template: "%s · geco" },
  description:
    "Confronta agenzie immobiliari, tecnici e artigiani verificati della tua zona. Richiedi un contatto in pochi minuti, con prezzi indicativi e recensioni verificate.",
};

export const viewport: Viewport = {
  themeColor: "#1f3a2b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: lo script in <head> può aggiungere data-benvenuto a <html> prima di React.
    <html lang="it" className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: WELCOME_HEAD_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <WelcomeOverlay />
        <Suspense fallback={null}>
          <WelcomeTransition />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
