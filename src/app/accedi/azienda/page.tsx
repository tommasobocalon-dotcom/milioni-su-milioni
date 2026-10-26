import type { Metadata } from "next";
import { AuthScreen } from "../auth-screen";

export const metadata: Metadata = { title: "Accesso aziende", robots: { index: false } };

export default function BusinessLoginPage({ searchParams }: PageProps<"/accedi/azienda">) {
  return <AuthScreen audience="business" searchParams={searchParams} />;
}
