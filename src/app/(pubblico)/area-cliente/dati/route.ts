import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { exportClientData } from "@/lib/data/client-data";

/** "Scarica i tuoi dati" (GDPR art. 15 e 20): un file JSON con account, richieste e messaggi all'assistenza. */
export async function GET() {
  const user = await requireUser();
  const data = await exportClientData(user.id);
  if (!data) return NextResponse.json({ error: "Account non trovato" }, { status: 404 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gecoitalia-dati-${data.exportedAt.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
