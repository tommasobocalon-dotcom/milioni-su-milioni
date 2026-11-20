import { describe, expect, it } from "vitest";
import { placeInQuery } from "./place-in-query";

const PLACES = [
  { name: "Venezia", aliases: ["Mestre", "Lido di Venezia"] },
  { name: "Padova", aliases: [] },
  { name: "Treviso", aliases: [] },
  { name: "Abano Terme", aliases: [] },
  { name: "Bagnoli di Sopra", aliases: [] },
  { name: "Castelfranco Veneto", aliases: [] },
  { name: "Paese", aliases: [] },
  { name: "Terrazzo", aliases: [] },
  { name: "Mira", aliases: [] },
];

describe("placeInQuery", () => {
  it.each([
    ["rifare il bagno a Mestre", "Mestre", "rifare il bagno"],
    ["vendere casa a Padova", "Padova", "vendere casa"],
    ["elettricista Treviso", "Treviso", "elettricista"],
    ["idraulico ad Abano Terme", "Abano Terme", "idraulico"],
    ["caldaia rotta in zona Castelfranco Veneto", "Castelfranco Veneto", "caldaia rotta"],
    ["cerco casa in affitto a Venezia", "Venezia", "cerco casa in affitto"],
    ["rifare il bagno a mestre", "Mestre", "rifare il bagno"],
    ["Idraulico a Pàdova", "Padova", "Idraulico"],
    ["traslocare casa da Padova a Treviso", "Padova", "traslocare casa a Treviso"],
    ["imbianchino a Bagnoli di Sopra", "Bagnoli di Sopra", "imbianchino"],
    ["idraulico a Paese", "Paese", "idraulico"],
  ])("«%s» → %s", (query, place, rest) => {
    const found = placeInQuery(query, PLACES);
    expect(found?.place).toBe(place);
    expect(found?.rest).toBe(rest);
  });

  it.each([
    "rifare il bagno",
    "pavimento del terrazzo",
    "casa in paese",
    "mira bene il preventivo",
    "asdfgh",
    "",
  ])("«%s» → nessun comune", (query) => {
    expect(placeInQuery(query, PLACES)).toBeNull();
  });
});
