import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["600"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });

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
    <html lang="it" className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
