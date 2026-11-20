import { NextResponse, type NextRequest } from "next/server";
import { getMunicipalities } from "@/lib/data/catalog";
import { interpretQuery } from "@/lib/domain/intent";
import { placeInQuery } from "@/lib/domain/place-in-query";

/**
 * Barra di ricerca della Home: interpreta "cosa ti serve" e porta alla sezione giusta.
 * Se il campo Comune è vuoto, il comune si cerca dentro la frase ("rifare il bagno a Mestre").
 * Il testo scritto viaggia in `cerca`, così i risultati possono ricordarlo o dire che non l'hanno capito.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 200) ?? "";
  let where = request.nextUrl.searchParams.get("dove")?.trim().slice(0, 80) ?? "";
  let what = q;

  if (!where && q) {
    const found = placeInQuery(q, await getMunicipalities());
    if (found) {
      where = found.place;
      what = found.rest;
    }
  }

  const intent = interpretQuery(what);
  const target = new URL(intent.mode === "agency" ? "/trova-casa" : "/trova-professionista", request.url);
  if (intent.mode === "pro" && intent.category) target.searchParams.set("categoria", intent.category);
  if (intent.service) target.searchParams.set("servizio", intent.service);
  if (where) target.searchParams.set("dove", where);
  if (q) target.searchParams.set("cerca", q.slice(0, 80));
  return NextResponse.redirect(target, 303);
}
