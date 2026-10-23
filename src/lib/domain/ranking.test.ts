import { describe, expect, it } from "vitest";
import { organicScore } from "./ranking";

const base = {
  rating: { average: 4.6, count: 60 },
  completeness: 80,
  responseMinutes: 120,
  planWeight: 2,
  distanceKm: 3,
};

describe("organicScore", () => {
  it("stays between 0 and 1", () => {
    const s = organicScore(base);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("rewards better reviews, faster answers and fuller profiles", () => {
    expect(organicScore({ ...base, rating: { average: 4.9, count: 200 } })).toBeGreaterThan(organicScore(base));
    expect(organicScore({ ...base, responseMinutes: 30 })).toBeGreaterThan(organicScore(base));
    expect(organicScore({ ...base, completeness: 100 })).toBeGreaterThan(organicScore(base));
  });

  it("gives the plan some weight but not enough to beat a much better profile", () => {
    const paid = organicScore({ ...base, planWeight: 3, rating: { average: 4.0, count: 5 }, completeness: 50 });
    const good = organicScore({ ...base, planWeight: 1, rating: { average: 4.9, count: 150 }, completeness: 95 });
    expect(good).toBeGreaterThan(paid);
  });

  it("prefers partners closer to the searched place", () => {
    expect(organicScore({ ...base, distanceKm: 1 })).toBeGreaterThan(organicScore({ ...base, distanceKm: 25 }));
  });

  it("handles partners without reviews or response data", () => {
    expect(organicScore({ ...base, rating: { average: 0, count: 0 }, responseMinutes: null, distanceKm: null })).toBeGreaterThan(0);
  });
});
