import { describe, expect, it } from "vitest";
import {
  CategoryInput,
  QuestionInput,
  ServiceInput,
  formatOptions,
  parseOptions,
  uniqueQuestionKey,
  uniqueSlug,
} from "./taxonomy";

describe("CategoryInput", () => {
  it("rimuove gli spazi nei nomi", () => {
    expect(CategoryInput.safeParse({
      name: "  Idraulico ",
      pluralName: " Idraulici  ",
      partnerType: "artisan",
      icon: "droplet",
    })).toEqual({
      success: true,
      data: { name: "Idraulico", pluralName: "Idraulici", partnerType: "artisan", icon: "droplet" },
    });
  });

  it("segnala nomi e scelte non validi", () => {
    const result = CategoryInput.safeParse({
      name: " x ",
      pluralName: "a".repeat(61),
      partnerType: "other",
      icon: "unknown",
    });
    expect(result.error?.issues).toMatchObject([
      { path: ["name"], message: "Scrivi il nome della categoria" },
      { path: ["pluralName"], message: "Il nome al plurale può avere al massimo 60 caratteri" },
      { path: ["partnerType"], message: "Scegli il tipo di partner" },
      { path: ["icon"], message: "Scegli un’icona per la categoria" },
    ]);
  });
});

describe("ServiceInput", () => {
  it("rimuove gli spazi dal nome e accetta l’unità di prezzo", () => {
    expect(ServiceInput.safeParse({ name: "  Sostituzione rubinetto  ", defaultUnit: "visit" })).toEqual({
      success: true,
      data: { name: "Sostituzione rubinetto", defaultUnit: "visit" },
    });
  });

  it.each([
    [" ", "Scrivi il nome del servizio"],
    ["a".repeat(81), "Il nome del servizio può avere al massimo 80 caratteri"],
  ])("segnala il nome e l’unità di prezzo non validi", (name, message) => {
    const result = ServiceInput.safeParse({ name, defaultUnit: "day" });
    expect(result.error?.issues).toMatchObject([
      { path: ["name"], message },
      { path: ["defaultUnit"], message: "Scegli l’unità di prezzo" },
    ]);
  });
});

describe("QuestionInput", () => {
  it("valida una scelta con i valori di FormData", () => {
    const form = new FormData();
    form.set("label", "  Quale finitura preferisci? ");
    form.set("help", "  Scegli una finitura. ");
    form.set("type", "select");
    form.set("required", "on");
    form.set("options", " Lucida\nOpaca ");

    expect(QuestionInput.safeParse(Object.fromEntries(form))).toEqual({
      success: true,
      data: {
        label: "Quale finitura preferisci?",
        help: "Scegli una finitura.",
        type: "select",
        required: true,
        options: [{ value: "lucida", label: "Lucida" }, { value: "opaca", label: "Opaca" }],
      },
    });
  });

  it.each([
    ["assente", {}, false],
    ["stringa vuota", { required: "" }, false],
    ["false", { required: false }, false],
    ["stringa true", { required: "true" }, true],
    ["true", { required: true }, true],
  ])("interpreta il campo obbligatorio quando vale %s", (_description, fields, required) => {
    const result = QuestionInput.safeParse({
      label: "Quanti metri quadrati?",
      help: "  ",
      type: "number",
      options: "Uno\nDue",
      ...fields,
    });
    expect(result).toEqual({
      success: true,
      data: { label: "Quanti metri quadrati?", help: null, type: "number", required, options: null },
    });
  });

  it.each([undefined, "", "Opaca", "Lucida\nLùcida"])(
    "richiede almeno due opzioni distinte per la scelta (%s)",
    (options) => {
      const fields = options === undefined ? {} : { options };
      const result = QuestionInput.safeParse({ label: "Quale finitura?", type: "select", ...fields });
      expect(result.error?.issues).toMatchObject([
        { path: ["options"], message: "Scrivi almeno due opzioni, una per riga" },
      ]);
    },
  );

  it("segnala i campi della domanda non validi", () => {
    const result = QuestionInput.safeParse({
      label: "a".repeat(121),
      help: "a".repeat(201),
      type: "date",
      required: "yes",
      options: ["Opaca", "Lucida"],
    });
    expect(result.error?.issues).toMatchObject([
      { path: ["label"], message: "Il testo della domanda può avere al massimo 120 caratteri" },
      { path: ["help"], message: "Il testo di aiuto può avere al massimo 200 caratteri" },
      { path: ["type"], message: "Scegli il tipo di domanda" },
      { path: ["required"], message: "Indica se la domanda è obbligatoria" },
      { path: ["options"], message: "Scrivi le opzioni, una per riga" },
    ]);
  });
});

describe("parseOptions", () => {
  it("salta le righe vuote e conserva la prima opzione con lo stesso valore", () => {
    expect(parseOptions("  Caffè  \r\n  \nCAFFE\n Tè verde\nTÈ-VERDE\n")).toEqual([
      { value: "caffe", label: "Caffè" },
      { value: "te-verde", label: "Tè verde" },
    ]);
  });

  it("limita le etichette a 80 caratteri e conserva al massimo 20 opzioni distinte", () => {
    const longLabel = "a".repeat(80);
    const lines = Array.from({ length: 21 }, (_, index) => `Opzione ${index + 1}`);
    const options = parseOptions([`${longLabel} prima`, `${longLabel} seconda`, ...lines].join("\n"));
    expect(options).toHaveLength(20);
    expect(options[0]).toEqual({ value: longLabel, label: longLabel });
    expect(options[19]).toEqual({ value: "opzione-19", label: "Opzione 19" });
  });
});

describe("formatOptions", () => {
  it("unisce le etichette, una per riga", () => {
    expect(formatOptions([{ value: "caffe", label: "Caffè" }, { value: "te", label: "Tè" }]))
      .toBe("Caffè\nTè");
  });

  it("restituisce testo vuoto se mancano le opzioni", () => {
    expect(formatOptions(null)).toBe("");
    expect(formatOptions(undefined)).toBe("");
    expect(formatOptions([])).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("rimuove gli accenti e salta gli slug già usati", () => {
    const taken = new Map([["gia-pronto", true], ["gia-pronto-2", true]]).keys();
    expect(uniqueSlug(" Già pronto! ", taken)).toBe("gia-pronto-3");
    expect(uniqueSlug("Città", [])).toBe("citta");
  });

  it("usa la base di riserva se lo slug è vuoto", () => {
    expect(uniqueSlug("?!", ["categoria"])).toBe("categoria-2");
  });
});

describe("uniqueQuestionKey", () => {
  it("rimuove gli accenti, usa i trattini bassi e salta le chiavi già usate", () => {
    expect(uniqueQuestionKey("È già pronta?", ["e_gia_pronta", "e_gia_pronta_2"])).toBe("e_gia_pronta_3");
    expect(uniqueQuestionKey("?!", ["domanda"])).toBe("domanda_2");
  });

  it("rispetta il limite di 40 caratteri anche con un suffisso di due cifre", () => {
    const label = "a".repeat(45);
    const base = "a".repeat(40);
    const taken = [base, ...Array.from({ length: 8 }, (_, index) => `${base.slice(0, 38)}_${index + 2}`)];
    expect(uniqueQuestionKey(label, [])).toBe(base);
    expect(uniqueQuestionKey(label, taken)).toBe(`${base.slice(0, 37)}_10`);
  });
});
