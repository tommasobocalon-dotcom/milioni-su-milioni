import { describe, expect, it } from "vitest";
import { bearingDeg, nearestPlace, parseCoords, parseRadius, radarPoint, radarRingKm } from "./nearby";

const PADOVA = { lat: 45.4064, lng: 11.8768 };

describe("parseRadius", () => {
  it("accepts only the radii offered in the page", () => {
    expect(parseRadius("10")).toBe(10);
    expect(parseRadius("7")).toBe(10);
    expect(parseRadius(undefined)).toBe(10);
  });
});

describe("parseCoords", () => {
  it("rounds the position to about one kilometre", () => {
    expect(parseCoords("45.40641", "11.87683")).toEqual({ lat: 45.41, lng: 11.88 });
  });

  it("rejects missing or impossible coordinates", () => {
    expect(parseCoords(undefined, "11.8")).toBeNull();
    expect(parseCoords("abc", "11.8")).toBeNull();
    expect(parseCoords("95", "11.8")).toBeNull();
    expect(parseCoords("45", "200")).toBeNull();
  });
});

describe("bearingDeg", () => {
  it("measures the compass direction, 0 = north and 90 = east", () => {
    expect(bearingDeg(PADOVA, { lat: 45.6, lng: 11.8768 })).toBeCloseTo(0, 0);
    expect(bearingDeg(PADOVA, { lat: 45.4064, lng: 12.2 })).toBeCloseTo(90, 0);
    expect(bearingDeg(PADOVA, { lat: 45.2, lng: 11.8768 })).toBeCloseTo(180, 0);
    expect(bearingDeg(PADOVA, { lat: 45.4064, lng: 11.5 })).toBeCloseTo(270, 0);
  });
});

describe("radarPoint", () => {
  it("puts the centre in the middle and north at the top", () => {
    expect(radarPoint(0, 0, 10)).toEqual({ x: 0.5, y: 0.5 });
    const north = radarPoint(10, 0, 10);
    expect(north.x).toBeCloseTo(0.5);
    expect(north.y).toBeCloseTo(0);
  });

  it("places east on the right, spreading near points with the square root of the distance", () => {
    const east = radarPoint(2.5, 90, 10);
    expect(east.x).toBeCloseTo(0.75);
    expect(east.y).toBeCloseTo(0.5);
  });

  it("labels each ring with the real distance it stands for", () => {
    expect(radarRingKm(0.5, 10)).toBe(2.5);
    expect(radarRingKm(1, 10)).toBe(10);
    // un punto a quella distanza cade proprio sull'anello
    expect(radarPoint(radarRingKm(0.5, 10), 90, 10).x).toBeCloseTo(0.75);
  });

  it("keeps points beyond the radius on the edge", () => {
    const far = radarPoint(40, 180, 10);
    expect(far.x).toBeCloseTo(0.5);
    expect(far.y).toBeCloseTo(1);
  });
});

describe("nearestPlace", () => {
  it("finds the closest municipality", () => {
    const places = [
      { name: "Venezia", lat: 45.4408, lng: 12.3155 },
      { name: "Padova", lat: 45.4064, lng: 11.8768 },
      { name: "Treviso", lat: 45.6669, lng: 12.243 },
    ];
    expect(nearestPlace({ lat: 45.39, lng: 11.9 }, places)?.name).toBe("Padova");
    expect(nearestPlace({ lat: 45.39, lng: 11.9 }, [])).toBeNull();
  });
});
