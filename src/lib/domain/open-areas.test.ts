import { describe, expect, it } from "vitest";
import { isProvinceOpen, OPEN_PROVINCES } from "./open-areas";

describe("isProvinceOpen", () => {
  it("opens only the province of Treviso at launch", () => {
    expect(OPEN_PROVINCES).toEqual(["TV"]);
    expect(isProvinceOpen("TV")).toBe(true);
  });

  it("keeps the other provinces of Veneto closed", () => {
    for (const code of ["VE", "PD", "VR", "VI", "BL", "RO"]) expect(isProvinceOpen(code)).toBe(false);
  });

  it("accepts the code in lower case", () => {
    expect(isProvinceOpen("tv")).toBe(true);
  });
});
