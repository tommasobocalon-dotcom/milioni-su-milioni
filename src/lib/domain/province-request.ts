import { z } from "zod";
import { VENETO_PROVINCES } from "@/lib/data/veneto-map";
import { isActiveProvince, PROVINCE_NEEDS, PROVINCE_NOTE_MAX, type ProvinceNeed } from "./coverage";

/** Modulo "Inoltra una richiesta" della mappa in Home, per le province dove il sito non è ancora attivo. */

export type ProvinceRequestField = "province" | "need" | "place" | "note" | "email";
export type ProvinceRequestInput = Record<ProvinceRequestField, string>;
export type ProvinceRequest = {
  provinceId: number;
  provinceCode: string;
  provinceName: string;
  need: ProvinceNeed;
  /** Comune scritto dalla persona: lo riconosce il server tra quelli della provincia. */
  place: string | null;
  note: string | null;
  email: string;
};

const optional = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((s) => s || null);

const Schema = z.object({
  need: z.enum(PROVINCE_NEEDS.map((n) => n.value), { error: "Scegli cosa cerchi" }),
  place: optional(80, "Nome del comune troppo lungo"),
  note: optional(PROVINCE_NOTE_MAX, `Scrivilo in poche parole (al massimo ${PROVINCE_NOTE_MAX} caratteri)`),
  email: z.string().trim().toLowerCase().pipe(z.email("Controlla l'indirizzo email")),
});

export function parseProvinceRequest(input: ProvinceRequestInput): { ok: true; data: ProvinceRequest } | { ok: false; error: string; field: ProvinceRequestField } {
  const province = VENETO_PROVINCES.find((p) => p.code === input.province);
  if (!province) return { ok: false, field: "province", error: "Scegli una provincia del Veneto" };
  if (isActiveProvince(province.code)) {
    return { ok: false, field: "province", error: `In provincia di ${province.name} ci siamo già: cerca direttamente professionisti e agenzie.` };
  }
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: issue.path[0] as ProvinceRequestField };
  }
  return { ok: true, data: { provinceId: province.id, provinceCode: province.code, provinceName: province.name, ...parsed.data } };
}
