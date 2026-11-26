import { z } from "zod";
import { slugify, type PriceUnit } from "./format";

export const PARTNER_TYPES = ["technician", "artisan", "agency", "b2b"] as const;
export type PartnerTypeValue = (typeof PARTNER_TYPES)[number];

export const PARTNER_TYPE_LABEL: Record<PartnerTypeValue, string> = {
  technician: "Tecnico",
  artisan: "Artigiano",
  agency: "Agenzia immobiliare",
  b2b: "Azienda per le imprese",
};

export const CATEGORY_ICONS = [
  "building", "droplet", "zap", "ruler", "roller", "wrench",
  "sofa", "leaf", "sparkles", "truck", "blinds", "tiles",
] as const;

export const PRICE_UNITS = ["flat", "sqm", "hour", "visit", "percent", "month", "unit"] as const satisfies readonly PriceUnit[];

export const QUESTION_TYPES = ["text", "textarea", "number", "select"] as const;
export const QUESTION_TYPE_LABEL = {
  text: "Testo breve",
  textarea: "Testo lungo",
  number: "Numero",
  select: "Scelta da un elenco",
};

export type QuestionOption = { value: string; label: string };

const MAX_OPTIONS = 20;
const MAX_OPTION_LABEL_LENGTH = 80;
const MAX_QUESTION_KEY_LENGTH = 40;

export const CategoryInput = z.object({
  name: z.string({ error: "Scrivi il nome della categoria" }).trim()
    .min(2, "Scrivi il nome della categoria")
    .max(60, "Il nome della categoria può avere al massimo 60 caratteri"),
  pluralName: z.string({ error: "Scrivi il nome della categoria al plurale" }).trim()
    .min(2, "Scrivi il nome della categoria al plurale")
    .max(60, "Il nome al plurale può avere al massimo 60 caratteri"),
  partnerType: z.enum(PARTNER_TYPES, { error: "Scegli il tipo di partner" }),
  icon: z.enum(CATEGORY_ICONS, { error: "Scegli un’icona per la categoria" }),
}, { error: "Inserisci i dati della categoria" });

export const ServiceInput = z.object({
  name: z.string({ error: "Scrivi il nome del servizio" }).trim()
    .min(2, "Scrivi il nome del servizio")
    .max(80, "Il nome del servizio può avere al massimo 80 caratteri"),
  defaultUnit: z.enum(PRICE_UNITS, { error: "Scegli l’unità di prezzo" }),
}, { error: "Inserisci i dati del servizio" });

export const QuestionInput = z.object({
  label: z.string({ error: "Scrivi il testo della domanda" }).trim()
    .min(2, "Scrivi il testo della domanda")
    .max(120, "Il testo della domanda può avere al massimo 120 caratteri"),
  help: z.string({ error: "Inserisci un testo di aiuto valido" }).trim()
    .max(200, "Il testo di aiuto può avere al massimo 200 caratteri")
    .default("")
    .transform((help) => help || null),
  type: z.enum(QUESTION_TYPES, { error: "Scegli il tipo di domanda" }),
  required: z.literal(["on", "true", true, "", false], { error: "Indica se la domanda è obbligatoria" })
    .default(false)
    .transform((required) => required === "on" || required === "true" || required === true),
  options: z.string({ error: "Scrivi le opzioni, una per riga" })
    .default("")
    .transform(parseOptions),
}, { error: "Inserisci i dati della domanda" })
  .refine(({ type, options }) => type !== "select" || options.length >= 2, {
    path: ["options"],
    error: "Scrivi almeno due opzioni, una per riga",
  })
  .transform((question) => ({
    ...question,
    options: question.type === "select" ? question.options : null,
  }));

/** Opzioni scritte una per riga. A parità di valore vince la prima. */
export function parseOptions(text: string): QuestionOption[] {
  const seen = new Set<string>();
  const options: QuestionOption[] = [];
  for (const line of text.split("\n")) {
    const label = line.trim().slice(0, MAX_OPTION_LABEL_LENGTH).trimEnd();
    if (!label) continue;
    const value = slugify(label);
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label });
    if (options.length === MAX_OPTIONS) break;
  }
  return options;
}

export function formatOptions(options: QuestionOption[] | null | undefined): string {
  return options?.map(({ label }) => label).join("\n") ?? "";
}

export function uniqueSlug(name: string, taken: Iterable<string>): string {
  const base = slugify(name) || "categoria";
  const used = new Set(taken);
  let slug = base;
  for (let index = 2; used.has(slug); index++) {
    slug = `${base}-${index}`;
  }
  return slug;
}

/** Il suffisso numerico rientra nel limite della chiave. */
export function uniqueQuestionKey(label: string, taken: Iterable<string>): string {
  const base = (slugify(label).replace(/-/g, "_") || "domanda").slice(0, MAX_QUESTION_KEY_LENGTH);
  const used = new Set(taken);
  let key = base;
  for (let index = 2; used.has(key); index++) {
    const suffix = `_${index}`;
    key = base.slice(0, MAX_QUESTION_KEY_LENGTH - suffix.length) + suffix;
  }
  return key;
}
