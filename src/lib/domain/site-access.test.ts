import { describe, expect, it } from "vitest";
import { hasSiteAccess, parseSiteAccess } from "./site-access";

const basic = (user: string, password: string) => `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

describe("parseSiteAccess", () => {
  it("senza variabile il sito è aperto", () => {
    expect(parseSiteAccess(undefined)).toBeNull();
    expect(parseSiteAccess("  ")).toBeNull();
  });

  it("legge più accessi nome:password separati da virgola", () => {
    expect(parseSiteAccess("tommaso:uno-due, cliente:tre:quattro")).toEqual([
      { user: "tommaso", password: "uno-due" },
      { user: "cliente", password: "tre:quattro" },
    ]);
  });

  it("con un valore malformato non apre il sito: nessun accesso valido", () => {
    expect(parseSiteAccess("solo-nome,:senza-nome,nome:")).toEqual([]);
  });
});

describe("hasSiteAccess", () => {
  const logins = [
    { user: "tommaso", password: "uno-due" },
    { user: "cliente", password: "tre:quattro" },
  ];

  it("accetta nome e password giusti di ciascun membro", () => {
    expect(hasSiteAccess(basic("tommaso", "uno-due"), logins)).toBe(true);
    expect(hasSiteAccess(basic("cliente", "tre:quattro"), logins)).toBe(true);
  });

  it("rifiuta password sbagliata, nome sconosciuto o password di un altro membro", () => {
    expect(hasSiteAccess(basic("tommaso", "sbagliata"), logins)).toBe(false);
    expect(hasSiteAccess(basic("ospite", "uno-due"), logins)).toBe(false);
    expect(hasSiteAccess(basic("tommaso", "tre:quattro"), logins)).toBe(false);
  });

  it("rifiuta richieste senza credenziali o con un altro schema", () => {
    expect(hasSiteAccess(null, logins)).toBe(false);
    expect(hasSiteAccess("Bearer abc", logins)).toBe(false);
    expect(hasSiteAccess("Basic non-base64!", logins)).toBe(false);
  });

  it("con l'elenco vuoto non entra nessuno", () => {
    expect(hasSiteAccess(basic("tommaso", "uno-due"), [])).toBe(false);
  });
});
