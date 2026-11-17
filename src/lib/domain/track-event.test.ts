import { describe, expect, it } from "vitest";
import { parseTrackEvent, visitorKey } from "./track-event";

const id = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

describe("parseTrackEvent", () => {
  it("accetta una visita o un'apertura del modulo con un id valido", () => {
    expect(parseTrackEvent({ partnerId: id, type: "view" })).toEqual({ partnerId: id, type: "view" });
    expect(parseTrackEvent({ partnerId: id, type: "contact_click" })).toEqual({ partnerId: id, type: "contact_click" });
  });

  it("rifiuta le impressioni: le registra solo il server con la ricerca", () => {
    expect(parseTrackEvent({ partnerId: id, type: "impression" })).toBeNull();
  });

  it("rifiuta id non validi, tipi sconosciuti e corpi malformati", () => {
    expect(parseTrackEvent({ partnerId: "1; drop table", type: "view" })).toBeNull();
    expect(parseTrackEvent({ partnerId: id, type: "altro" })).toBeNull();
    expect(parseTrackEvent({ partnerId: id })).toBeNull();
    expect(parseTrackEvent(null)).toBeNull();
    expect(parseTrackEvent("view")).toBeNull();
  });
});

describe("visitorKey", () => {
  const morning = new Date("2026-11-17T07:00:00Z");
  const evening = new Date("2026-11-17T21:00:00Z"); // 22:00 a Roma, stesso giorno
  const nextDay = new Date("2026-11-17T23:30:00Z"); // 00:30 del 18 a Roma

  it("è la stessa per lo stesso IP nello stesso giorno italiano", () => {
    expect(visitorKey("93.40.1.2", morning, "segreto")).toBe(visitorKey("93.40.1.2", evening, "segreto"));
  });

  it("cambia con il giorno, con l'IP e con la chiave", () => {
    const base = visitorKey("93.40.1.2", morning, "segreto");
    expect(visitorKey("93.40.1.2", nextDay, "segreto")).not.toBe(base);
    expect(visitorKey("93.40.1.3", morning, "segreto")).not.toBe(base);
    expect(visitorKey("93.40.1.2", morning, "altra")).not.toBe(base);
  });

  it("non contiene l'IP", () => {
    expect(visitorKey("93.40.1.2", morning, "segreto")).not.toContain("93.40");
  });
});
