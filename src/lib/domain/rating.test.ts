import { describe, expect, it } from "vitest";
import { bayesianScore, ratingDistribution } from "./rating";

describe("bayesianScore", () => {
  it("returns the prior mean when there are no reviews", () => {
    expect(bayesianScore({ average: 0, count: 0 }, { mean: 4.2, weight: 10 })).toBeCloseTo(4.2);
  });

  it("keeps a few perfect reviews below many solid ones", () => {
    const prior = { mean: 4.2, weight: 10 };
    const fewPerfect = bayesianScore({ average: 5, count: 3 }, prior);
    const manySolid = bayesianScore({ average: 4.8, count: 126 }, prior);
    expect(fewPerfect).toBeLessThan(manySolid);
  });

  it("moves towards the real average as reviews grow", () => {
    const prior = { mean: 4, weight: 10 };
    expect(bayesianScore({ average: 5, count: 1000 }, prior)).toBeGreaterThan(4.98);
  });
});

describe("ratingDistribution", () => {
  it("counts each star value and ignores out of range values", () => {
    expect(ratingDistribution([5, 5, 4, 1, 0, 6])).toEqual({ 5: 2, 4: 1, 3: 0, 2: 0, 1: 1 });
  });
});
