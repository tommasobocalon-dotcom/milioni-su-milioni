import { describe, expect, it } from "vitest";
import { parseTrackEvent } from "./track-event";

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
