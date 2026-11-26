import { afterAll, describe, expect, it } from "vitest";
import { isProvinceOpen } from "./open-areas";

describe("isProvinceOpen", () => {
  it("opens only the provinces in the list", () => {
    expect(isProvinceOpen("TV", ["TV"])).toBe(true);
    for (const code of ["VE", "PD", "VR", "VI", "BL", "RO"]) expect(isProvinceOpen(code, ["TV"])).toBe(false);
  });

  it("accepts the code in lower case", () => {
    expect(isProvinceOpen("tv", ["TV"])).toBe(true);
  });
});

// La migrazione 0038 apre solo Treviso, come la costante di prima. Serve il database di `npm run dev`; senza, si salta.
const postgres = (await import("postgres")).default;
const owner = postgres("postgres://postgres:postgres@127.0.0.1:54329/geco_e2e", { max: 1, onnotice: () => {}, connect_timeout: 2 });
const UP = await owner`select 1`.then(
  () => true,
  () => false,
);

describe.skipIf(!UP)("province aperte al lancio", () => {
  afterAll(() => owner.end());

  it("solo la provincia di Treviso", async () => {
    expect((await owner<{ code: string }[]>`select code from provinces where is_open order by code`).map((r) => r.code)).toEqual(["TV"]);
  });
});
