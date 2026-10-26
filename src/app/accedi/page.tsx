import type { Metadata } from "next";
import { AuthScreen } from "./auth-screen";

export const metadata: Metadata = { title: "Accedi", robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<"/accedi">) {
  return <AuthScreen audience="client" searchParams={searchParams} />;
}
