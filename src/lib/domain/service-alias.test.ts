import { describe, expect, it } from "vitest";
import { findService } from "./service-alias";

const SERVICES = [
  { id: "1", slug: "compravendita" },
  { id: "2", slug: "locazione-residenziale" },
];

describe("findService", () => {
  it("trova il servizio per slug", () => {
    expect(findService(SERVICES, "compravendita")?.id).toBe("1");
  });
  it("accetta il vecchio nome degli affitti (link della Home e ricerca libera)", () => {
    expect(findService(SERVICES, "affitti")?.id).toBe("2");
    expect(findService([{ id: "3", slug: "affitti" }], "locazione-residenziale")?.id).toBe("3");
  });
  it("niente servizio se lo slug non esiste", () => {
    expect(findService(SERVICES, "zzz")).toBeNull();
    expect(findService(SERVICES, undefined)).toBeNull();
  });
});
