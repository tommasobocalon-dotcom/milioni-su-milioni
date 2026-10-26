import "server-only";
import { and, count, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";

/**
 * Freno per indirizzo IP sugli endpoint pubblici (accesso, invio richiesta). Si appoggia ad audit_logs,
 * quindi vale su tutte le istanze serverless, al contrario di un contatore in memoria. È una difesa in
 * profondità: la protezione vera contro i flood sta al bordo (Vercel Firewall / Cloudflare, vedi DEPLOY.md).
 */

/** IP del chiamante dietro al proxy di Vercel. "sconosciuto" se l'header non c'è. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || h.get("x-real-ip")?.trim() || "sconosciuto";
}

/**
 * Vero se da questo IP sono già arrivate troppe azioni `action` nella finestra di `minutes`.
 * Registra sempre il tentativo, così il conteggio successivo lo include.
 */
export async function ipRateLimited(action: string, max: number, minutes: number): Promise<boolean> {
  const ip = await clientIp();
  const key = `${action}:${ip}`;
  const since = new Date(Date.now() - minutes * 60_000);
  const [row] = await db
    .select({ n: count() })
    .from(auditLogs)
    .where(and(eq(auditLogs.entity, "ip"), eq(auditLogs.entityId, key), gt(auditLogs.createdAt, since)));
  await db.insert(auditLogs).values({ actor: ip, action: `ip.${action}`, entity: "ip", entityId: key });
  return (row?.n ?? 0) >= max;
}
