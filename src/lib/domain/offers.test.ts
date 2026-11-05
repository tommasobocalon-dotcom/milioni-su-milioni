import { describe, expect, it } from "vitest";
import { isBoostPlacement } from "./offers";

describe("isBoostPlacement", () => {
  it("accetta solo i due boost", () => {
    expect(isBoostPlacement("search")).toBe(true);
    expect(isBoostPlacement("home")).toBe(true);
    expect(isBoostPlacement("toString")).toBe(false);
    expect(isBoostPlacement("")).toBe(false);
    expect(isBoostPlacement(undefined)).toBe(false);
  });
});
