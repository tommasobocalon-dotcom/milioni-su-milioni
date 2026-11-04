import { describe, expect, it } from "vitest";
import { canBoost, listingTier, rankListing } from "./ranking";

const BASE = 1;
const NORMAL = 2;
const PREMIUM = 3;
const item = (id: string, planWeight: number, boosted = false) => ({ id, planWeight, boosted });

describe("listingTier", () => {
  it("orders Premium + boost, Premium, Normal + boost, Normal, Base", () => {
    const tiers = [
      listingTier(PREMIUM, true),
      listingTier(PREMIUM, false),
      listingTier(NORMAL, true),
      listingTier(NORMAL, false),
      listingTier(BASE, false),
    ];
    expect([...tiers].sort((a, b) => b - a)).toEqual(tiers);
    expect(new Set(tiers).size).toBe(5);
  });

  it("ignores a boost on the Base plan, which cannot buy one", () => {
    expect(listingTier(BASE, true)).toBe(listingTier(BASE, false));
    expect(canBoost(BASE)).toBe(false);
    expect(canBoost(NORMAL)).toBe(true);
    expect(canBoost(PREMIUM)).toBe(true);
  });
});

describe("rankListing", () => {
  const items = [
    item("base-1", BASE),
    item("normal-1", NORMAL),
    item("premium-boost-1", PREMIUM, true),
    item("normal-boost-1", NORMAL, true),
    item("premium-1", PREMIUM),
    item("premium-boost-2", PREMIUM, true),
    item("base-2", BASE, true),
  ];

  it("puts one Premium with boost in the big slot and the rest by tier", () => {
    const { featured, results } = rankListing(items, "visitatore-a");
    expect(featured?.id).toMatch(/^premium-boost/);
    expect(results.map((r) => r.id)).not.toContain(featured?.id);
    const tiers = results.map((r) => listingTier(r.planWeight, r.boosted));
    expect([...tiers].sort((a, b) => b - a)).toEqual(tiers);
    expect(results.at(-1)?.id).toMatch(/^base/);
  });

  it("gives the same order to the same visitor every time", () => {
    expect(rankListing(items, "visitatore-a")).toEqual(rankListing(items, "visitatore-a"));
  });

  it("rotates who comes first among equals across visitors", () => {
    const firsts = new Set(
      Array.from({ length: 40 }, (_, i) => rankListing(items, `visitatore-${i}`).featured?.id),
    );
    expect(firsts).toEqual(new Set(["premium-boost-1", "premium-boost-2"]));
  });

  it("falls back to a Premium without boost for the big slot", () => {
    const { featured } = rankListing([item("normal-boost", NORMAL, true), item("premium", PREMIUM)], "v");
    expect(featured?.id).toBe("premium");
  });

  it("leaves the big slot empty without Premium partners", () => {
    const { featured, results } = rankListing([item("normal-boost", NORMAL, true), item("base", BASE)], "v");
    expect(featured).toBeNull();
    expect(results.map((r) => r.id)).toEqual(["normal-boost", "base"]);
  });
});
