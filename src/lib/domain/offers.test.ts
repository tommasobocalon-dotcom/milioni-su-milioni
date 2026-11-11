import { describe, expect, it } from "vitest";
import { SEARCH_BOOST_PACKAGES, AREA_EXTENSION_OFFER, areaExtensionTotal, homeSponsorPrice, HOME_SPONSOR_PACKAGES, isBoostPlacement, MAX_EXTENSION_MUNICIPALITIES, municipalityIdsFrom, planPromo, promoActive } from "./offers";

describe("isBoostPlacement", () => {
  it("accetta solo i due boost", () => {
    expect(isBoostPlacement("search")).toBe(true);
    expect(isBoostPlacement("home")).toBe(true);
    expect(isBoostPlacement("toString")).toBe(false);
    expect(isBoostPlacement("")).toBe(false);
    expect(isBoostPlacement(undefined)).toBe(false);
  });
});

describe("sponsorizzazione in Home a pacchetti in euro (decisione dei soci, 10/11/2026)", () => {
  const launch = new Date("2027-01-15T00:00:00Z");

  it("due pacchetti: 7 giorni a 79 € e 30 giorni a 249 €, IVA esclusa", () => {
    expect(HOME_SPONSOR_PACKAGES.map((p) => [p.days, p.priceCents, p.promoCents])).toEqual([
      [7, 7900, 3900],
      [30, 24900, 9900],
    ]);
  });

  it("promo valida per i primi 6 mesi dal lancio del sito", () => {
    expect(promoActive(new Date("2027-07-14T23:00:00Z"), launch)).toBe(true);
    expect(promoActive(new Date("2027-07-15T00:00:00Z"), launch)).toBe(false);
  });

  it("prima del lancio (data non ancora fissata) vale la promo", () => {
    expect(promoActive(new Date("2026-11-10T12:00:00Z"), null)).toBe(true);
  });

  it("prezzo da pagare: promo durante i 6 mesi, poi listino", () => {
    const week = HOME_SPONSOR_PACKAGES[0];
    expect(homeSponsorPrice(week, new Date("2027-02-01T00:00:00Z"), launch)).toEqual({ cents: 3900, listCents: 7900, promo: true });
    expect(homeSponsorPrice(week, new Date("2027-08-01T00:00:00Z"), launch)).toEqual({ cents: 7900, listCents: 7900, promo: false });
  });
});

describe("estensione territoriale a comuni (decisione dei soci, 10/11/2026)", () => {
  it("49 € IVA esclusa per ogni comune, per 30 giorni", () => {
    expect(AREA_EXTENSION_OFFER).toEqual({ days: 30, priceCents: 4900 });
    expect(areaExtensionTotal(3)).toBe(14700);
  });

  it("tiene i codici ISTAT validi, senza doppioni", () => {
    expect(municipalityIdsFrom([27042, "28060", 27042])).toEqual([27042, 28060]);
  });

  it("rifiuta scelte vuote, codici non validi o troppi comuni insieme", () => {
    expect(municipalityIdsFrom([])).toBeNull();
    expect(municipalityIdsFrom(["Padova"])).toBeNull();
    expect(municipalityIdsFrom([-1])).toBeNull();
    expect(municipalityIdsFrom("27042")).toBeNull();
    const many = Array.from({ length: MAX_EXTENSION_MUNICIPALITIES + 1 }, (_, i) => 27000 + i);
    expect(municipalityIdsFrom(many)).toBeNull();
  });
});

describe("boost nella ricerca a pacchetti in euro (decisione dei soci, 10/11/2026)", () => {
  it("due pacchetti: 24 ore a 15 € e 48 ore a 25 €, IVA esclusa", () => {
    expect(SEARCH_BOOST_PACKAGES.map((p) => [p.hours, p.priceCents])).toEqual([
      [24, 1500],
      [48, 2500],
    ]);
  });
});

describe("promo dei piani (soci, 11/11/2026)", () => {
  const normal = { code: "normal", monthlyPriceCents: 6900, yearlyPriceCents: 82800 };
  const premium = { code: "premium", monthlyPriceCents: 15900, yearlyPriceCents: 190800 };
  const base = { code: "base", monthlyPriceCents: 1299, yearlyPriceCents: 10788 };
  const launch = new Date("2027-01-01T00:00:00Z");
  const during = new Date("2027-03-01T00:00:00Z");
  const after = new Date("2027-08-01T00:00:00Z");

  it("primo mese a 39 € (Normal) e 79 € (Premium), anche dopo i 6 mesi di lancio", () => {
    expect(planPromo(normal, "monthly", after, launch)).toEqual({ payNowCents: 3900, listCents: 6900, giftHomeDays: 0 });
    expect(planPromo(premium, "monthly", during, launch)).toEqual({ payNowCents: 7900, listCents: 15900, giftHomeDays: 0 });
  });

  it("annuale in promo solo nei primi 6 mesi: 599 € invece di 828, 1490 € invece di 1908 con 30 giorni di logo in Home", () => {
    expect(planPromo(normal, "yearly", during, launch)).toEqual({ payNowCents: 59900, listCents: 82800, giftHomeDays: 0 });
    expect(planPromo(premium, "yearly", during, launch)).toEqual({ payNowCents: 149000, listCents: 190800, giftHomeDays: 30 });
    expect(planPromo(normal, "yearly", after, launch)).toBeNull();
    expect(planPromo(premium, "yearly", after, launch)).toBeNull();
  });

  it("niente promo per il Base, né se il prezzo promo non è più basso di quello di listino", () => {
    expect(planPromo(base, "monthly", during, launch)).toBeNull();
    expect(planPromo(base, "yearly", during, launch)).toBeNull();
    expect(planPromo({ ...normal, monthlyPriceCents: 3900 }, "monthly", during, launch)).toBeNull();
  });
});
