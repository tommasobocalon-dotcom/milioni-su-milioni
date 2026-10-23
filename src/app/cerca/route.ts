import { NextResponse, type NextRequest } from "next/server";
import { interpretQuery } from "@/lib/domain/intent";

/** Barra di ricerca della Home: interpreta "cosa ti serve" e porta alla sezione giusta. */
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.slice(0, 200) ?? "";
  const where = request.nextUrl.searchParams.get("dove")?.slice(0, 80) ?? "";
  const intent = interpretQuery(q);

  const target = new URL(intent.mode === "agency" ? "/trova-casa" : "/trova-professionista", request.url);
  if (intent.mode === "pro" && intent.category) target.searchParams.set("categoria", intent.category);
  if (intent.service) target.searchParams.set("servizio", intent.service);
  if (where.trim()) target.searchParams.set("dove", where.trim());
  return NextResponse.redirect(target, 303);
}
