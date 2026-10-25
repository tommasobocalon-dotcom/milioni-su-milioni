import { describe, expect, it } from "vitest";
import { boostedDays, boostUplift, change, dayKeys, fillDaily, parsePeriod, projectBoost, romeDay, stepRate } from "./stats";

describe("parsePeriod", () => {
  it("accetta solo 7, 30 e 90 giorni", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod("30")).toBe(30);
  });
  it("torna a 30 per valori mancanti o non ammessi", () => {
    expect(parsePeriod(undefined)).toBe(30);
    expect(parsePeriod("365")).toBe(30);
    expect(parsePeriod(["7", "90"])).toBe(7);
    expect(parsePeriod("abc")).toBe(30);
  });
});

describe("romeDay", () => {
  it("usa il giorno di calendario italiano, non quello UTC", () => {
    // 23:30 UTC del 24 ottobre = 01:30 del 25 ottobre a Roma (ora legale)
    expect(romeDay(new Date("2026-10-24T23:30:00Z"))).toBe("2026-10-25");
    expect(romeDay(new Date("2026-10-24T12:00:00Z"))).toBe("2026-10-24");
  });
});

describe("dayKeys", () => {
  it("elenca gli ultimi N giorni fino a oggi, dal più vecchio", () => {
    expect(dayKeys(new Date("2026-10-25T10:00:00Z"), 3)).toEqual(["2026-10-23", "2026-10-24", "2026-10-25"]);
  });
  it("attraversa il cambio dell'ora senza saltare o ripetere giorni", () => {
    const keys = dayKeys(new Date("2026-10-27T10:00:00Z"), 4);
    expect(keys).toEqual(["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"]);
  });
});

describe("fillDaily", () => {
  it("mette zero nei giorni senza dati e ignora quelli fuori periodo", () => {
    const keys = ["2026-10-23", "2026-10-24", "2026-10-25"];
    expect(
      fillDaily(
        [
          { day: "2026-10-25", n: 4 },
          { day: "2026-10-23", n: 1 },
          { day: "2026-10-01", n: 9 },
        ],
        keys,
      ),
    ).toEqual([1, 0, 4]);
  });
});

describe("change", () => {
  it("calcola la variazione percentuale arrotondata", () => {
    expect(change(15, 10)).toBe(50);
    expect(change(5, 10)).toBe(-50);
    expect(change(10, 10)).toBe(0);
  });
  it("non ha senso senza un periodo precedente", () => {
    expect(change(4, 0)).toBeNull();
  });
});

describe("stepRate", () => {
  it("percentuale intera del passaggio", () => {
    expect(stepRate(1, 3)).toBe(33);
    expect(stepRate(3, 3)).toBe(100);
  });
  it("non mostra percentuali impossibili o senza base", () => {
    expect(stepRate(1, 0)).toBeNull();
    expect(stepRate(9, 0)).toBeNull();
    expect(stepRate(9, 2)).toBeNull();
  });
});

describe("boostedDays", () => {
  it("segna i giorni coperti da almeno un boost, estremi compresi", () => {
    const keys = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"];
    const boosts = [{ startsAt: new Date("2026-10-21T08:00:00Z"), endsAt: new Date("2026-10-22T08:00:00Z") }];
    expect(boostedDays(keys, boosts)).toEqual([false, true, true, false]);
  });
  it("un boost che finisce a mezzanotte non copre il giorno dopo", () => {
    // 22:00 UTC del 21 = mezzanotte del 22 a Roma
    const boosts = [{ startsAt: new Date("2026-10-20T10:00:00Z"), endsAt: new Date("2026-10-21T22:00:00Z") }];
    expect(boostedDays(["2026-10-20", "2026-10-21", "2026-10-22"], boosts)).toEqual([true, true, false]);
  });
});

describe("boostUplift", () => {
  const plain = Array(10).fill(10);
  it("rapporto tra la media dei giorni con boost e quella senza", () => {
    const views = [...plain, 25, 25, 25];
    const mask = [...plain.map(() => false), true, true, true];
    expect(boostUplift(views, mask)).toBe(2.5);
  });
  it("null se i dati non bastano per una misura affidabile", () => {
    expect(boostUplift([10, 20], [false, true])).toBeNull();
    expect(boostUplift([...plain, 25], [...plain.map(() => false), true])).toBeNull();
    expect(boostUplift([...Array(10).fill(0), 5, 5, 5], [...plain.map(() => false), true, true, true])).toBeNull();
  });
  it("non scende sotto 1 e non supera 4", () => {
    const mask = [...plain.map(() => false), true, true, true];
    expect(boostUplift([...plain, 5, 5, 5], mask)).toBe(1);
    expect(boostUplift([...plain, 90, 90, 90], mask)).toBe(4);
  });
});

describe("projectBoost", () => {
  it("visite cumulate con e senza boost sull'orizzonte", () => {
    const p = projectBoost({ viewsPerDay: 10, uplift: 2, boostDays: 3, horizon: 5 });
    expect(p.without).toEqual([10, 20, 30, 40, 50]);
    expect(p.with).toEqual([20, 40, 60, 70, 80]);
    expect(p.extraViews).toBe(30);
  });
  it("il boost non supera l'orizzonte", () => {
    const p = projectBoost({ viewsPerDay: 1, uplift: 3, boostDays: 14, horizon: 7 });
    expect(p.extraViews).toBe(14);
  });
});
