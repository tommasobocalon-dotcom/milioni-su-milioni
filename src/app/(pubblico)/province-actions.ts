"use server";

import { findPlace } from "@/lib/data/catalog";
import { saveProvinceRequest } from "@/lib/data/province-requests";
import { parseProvinceRequest, type ProvinceRequestField, type ProvinceRequestInput } from "@/lib/domain/province-request";
import { logError } from "@/lib/domain/log";
import { ipRateLimited } from "@/lib/security/ip-limit";
import { TURNSTILE_ERROR, turnstileOk } from "@/lib/security/turnstile";

export type ProvinceRequestResult = { ok: true; email: string; provinceName: string } | { ok: false; error: string; field?: ProvinceRequestField };

/**
 * "Inoltra una richiesta" dalla mappa della Home: chi abita in una provincia dove non siamo ancora lascia cosa cerca e
 * l'email per essere avvisato. Il conteggio per provincia, nel gestionale, dice dove aprire dopo Treviso.
 */
export async function requestProvince(input: ProvinceRequestInput, turnstileToken?: string): Promise<ProvinceRequestResult> {
  const parsed = parseProvinceRequest(input);
  if (!parsed.ok) return parsed;
  const d = parsed.data;

  let municipalityId: number | null = null;
  if (d.place) {
    const place = await findPlace(d.place);
    if (!place) return { ok: false, field: "place", error: "Non troviamo questo comune: sceglilo dall'elenco o lascia vuoto" };
    if (place.provinceId !== d.provinceId) return { ok: false, field: "place", error: `${place.name} è in provincia di ${place.provinceName}` };
    municipalityId = place.id;
  }

  if (await ipRateLimited("province_request", 10, 60)) return { ok: false, error: "Troppe richieste da questo dispositivo. Riprova tra un'ora." };
  if (!(await turnstileOk(turnstileToken))) return { ok: false, error: TURNSTILE_ERROR };

  try {
    await saveProvinceRequest({ provinceId: d.provinceId, municipalityId, need: d.need, note: d.note, email: d.email });
  } catch (e) {
    logError("Richiesta di nuova provincia non salvata", e);
    return { ok: false, error: "Non siamo riusciti a salvare la richiesta. Riprova tra qualche minuto." };
  }
  return { ok: true, email: d.email, provinceName: d.provinceName };
}
