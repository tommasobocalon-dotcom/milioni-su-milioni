import { describe, expect, it } from "vitest";
import { formatOpeningHours, parseOpeningHours, parseSpecialties } from "./profile-fields";

describe("parseOpeningHours", () => {
  it("una riga per fascia, separata dai primi due punti", () => {
    expect(parseOpeningHours("Lun–Ven: 8:00–18:00\n\n  Sabato : su appuntamento  ")).toEqual([
      { label: "Lun–Ven", value: "8:00–18:00" },
      { label: "Sabato", value: "su appuntamento" },
    ]);
  });

  it("testo vuoto = nessun orario", () => {
    expect(parseOpeningHours("  \n ")).toEqual([]);
  });

  it("riga senza giorno o senza orario = errore con la riga", () => {
    expect(parseOpeningHours("Lun–Ven 8–18")).toEqual({ error: "Scrivi gli orari come «Lun–Ven: 8:00–18:00» (riga 1)" });
    expect(parseOpeningHours("Lun: 8–12\n: 14–18")).toEqual({ error: "Scrivi gli orari come «Lun–Ven: 8:00–18:00» (riga 2)" });
  });

  it("al massimo 10 righe", () => {
    expect(parseOpeningHours(Array.from({ length: 11 }, (_, i) => `G${i}: 8–12`).join("\n"))).toEqual({ error: "Al massimo 10 righe di orari" });
  });

  it("andata e ritorno con formatOpeningHours", () => {
    const hours = [{ label: "Lun–Ven", value: "8:00–18:00" }];
    expect(parseOpeningHours(formatOpeningHours(hours))).toEqual(hours);
  });
});

describe("parseSpecialties", () => {
  it("separate da virgola, senza doppioni né vuoti", () => {
    expect(parseSpecialties(" caldaie, impianti idraulici ,, Caldaie, bagni ")).toEqual(["caldaie", "impianti idraulici", "bagni"]);
  });

  it("al massimo 12, ognuna fino a 40 caratteri", () => {
    expect(parseSpecialties(Array.from({ length: 15 }, (_, i) => `s${i}`).join(","))).toHaveLength(12);
    expect(parseSpecialties("x".repeat(50))[0]).toHaveLength(40);
  });
});
