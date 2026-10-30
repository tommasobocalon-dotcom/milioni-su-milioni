import { describe, expect, it } from "vitest";
import { adminBaseUrl, routeByHost } from "./admin-host";

const ADMIN = "https://admin.gecoitalia.it";
const SITE = "https://gecoitalia.it";
const route = (host: string, pathname: string, search = "") => routeByHost({ host, pathname, search, adminUrl: ADMIN, siteUrl: SITE });

describe("gestionale su un indirizzo proprio", () => {
  it("senza ADMIN_URL tutto resta com'è, /admin compreso", () => {
    expect(routeByHost({ host: "gecoitalia.it", pathname: "/admin", search: "" })).toEqual({ action: "next" });
  });

  it("sul sito /admin non esiste", () => {
    expect(route("gecoitalia.it", "/admin")).toEqual({ action: "not-found" });
    expect(route("gecoitalia.it", "/admin/assistenza/3")).toEqual({ action: "not-found" });
    expect(route("gecoitalia.it", "/assistenza")).toEqual({ action: "next" });
    expect(route("gecoitalia.it", "/administrator")).toEqual({ action: "next" });
  });

  it("sull'indirizzo del gestionale la radice apre il gestionale", () => {
    expect(route("admin.gecoitalia.it", "/")).toEqual({ action: "redirect", location: "https://admin.gecoitalia.it/admin" });
    expect(route("ADMIN.gecoitalia.it", "/admin/partner")).toEqual({ action: "next" });
  });

  it("sull'indirizzo del gestionale passano i file statici, le pagine del sito portano al sito", () => {
    expect(route("admin.gecoitalia.it", "/_next/static/chunks/a.js")).toEqual({ action: "next" });
    expect(route("admin.gecoitalia.it", "/gestionale/icon-192.png")).toEqual({ action: "next" });
    expect(route("admin.gecoitalia.it", "/accedi/password", "?x=1")).toEqual({ action: "redirect", location: "https://gecoitalia.it/accedi/password?x=1" });
  });

  it("funziona anche in locale con la porta", () => {
    const local = { adminUrl: "http://admin.localhost:3000", siteUrl: "http://localhost:3000", search: "" };
    expect(routeByHost({ ...local, host: "admin.localhost:3000", pathname: "/" })).toEqual({ action: "redirect", location: "http://admin.localhost:3000/admin" });
    expect(routeByHost({ ...local, host: "localhost:3000", pathname: "/admin" })).toEqual({ action: "not-found" });
  });
});

describe("link al gestionale", () => {
  it("usa l'indirizzo proprio se c'è, altrimenti il sito", () => {
    expect(adminBaseUrl(ADMIN, SITE)).toBe("https://admin.gecoitalia.it/admin");
    expect(adminBaseUrl(undefined, "http://localhost:3000")).toBe("http://localhost:3000/admin");
  });
});
