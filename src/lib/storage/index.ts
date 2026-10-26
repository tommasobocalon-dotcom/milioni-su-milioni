import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Salvataggio dei file caricati (foto profilo, logo, portfolio). In sviluppo scrive su disco
 * (public/uploads). In produzione su Vercel il disco è di sola lettura: con STORAGE_PROVIDER=supabase
 * i file vanno su Supabase Storage. Il resto dell'app usa solo putImage() e riceve l'URL pubblico.
 */

export type StoredImage = { url: string };

function provider(): "local" | "supabase" {
  const p = process.env.STORAGE_PROVIDER;
  if (p === "supabase") return "supabase";
  if (p === "local") return "local";
  // Default sicuro: in produzione serve uno storage esterno, in sviluppo va bene il disco.
  if (process.env.NODE_ENV === "production") {
    throw new Error("STORAGE_PROVIDER non impostato in produzione (usa 'supabase')");
  }
  return "local";
}

const contentTypes = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;
export type ImageExt = keyof typeof contentTypes;

/** Carica un'immagine già validata e restituisce l'URL pubblico. `key` è del tipo "avatars/uuid.jpg". */
export async function putImage(key: string, bytes: Buffer, ext: ImageExt): Promise<StoredImage> {
  if (provider() === "supabase") return putSupabase(key, bytes, contentTypes[ext]);
  return putLocal(key, bytes);
}

async function putLocal(key: string, bytes: Buffer): Promise<StoredImage> {
  const dir = path.join(process.cwd(), "public", "uploads", path.dirname(key));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", "uploads", key), bytes);
  return { url: `/uploads/${key}` };
}

async function putSupabase(key: string, bytes: Buffer, contentType: string): Promise<StoredImage> {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";
  if (!base || !serviceKey) throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti");

  const res = await fetch(`${base}/storage/v1/object/${bucket}/${key}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${serviceKey}`,
      "content-type": contentType,
      "x-upsert": "true",
      "cache-control": "public, max-age=31536000, immutable",
    },
    body: new Uint8Array(bytes),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upload su Supabase non riuscito (${res.status})`);
  return { url: `${base}/storage/v1/object/public/${bucket}/${key}` };
}
