import { describe, expect, it } from "vitest";
import { pageItems, pageNumbers, parsePage } from "./pagination";

describe("parsePage", () => {
  it("legge un numero di pagina valido", () => {
    expect(parsePage("3")).toBe(3);
  });
  it("torna alla prima pagina con valori mancanti o sbagliati", () => {
    for (const v of [undefined, "", "0", "-2", "abc", "2.5", "1e3"]) expect(parsePage(v)).toBe(1);
  });
});

describe("pageItems", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);

  it("restituisce gli elementi della pagina e il numero di pagine", () => {
    expect(pageItems(items, 1, 10)).toEqual({ items: items.slice(0, 10), page: 1, pages: 3 });
    expect(pageItems(items, 3, 10)).toEqual({ items: [21, 22, 23], page: 3, pages: 3 });
  });
  it("porta all'ultima pagina se si chiede una pagina che non esiste", () => {
    expect(pageItems(items, 9, 10)).toEqual({ items: [21, 22, 23], page: 3, pages: 3 });
  });
  it("con zero elementi c'è comunque una pagina, vuota", () => {
    expect(pageItems([], 2, 10)).toEqual({ items: [], page: 1, pages: 1 });
  });
  it("la prima pagina può essere più corta delle altre", () => {
    expect(pageItems(items, 1, 10, 5)).toEqual({ items: [1, 2, 3, 4, 5], page: 1, pages: 3 });
    expect(pageItems(items, 2, 10, 5)).toEqual({ items: items.slice(5, 15), page: 2, pages: 3 });
    expect(pageItems(items, 3, 10, 5)).toEqual({ items: items.slice(15), page: 3, pages: 3 });
    expect(pageItems(items.slice(0, 5), 1, 10, 5)).toEqual({ items: items.slice(0, 5), page: 1, pages: 1 });
  });
});

describe("pageNumbers", () => {
  it("mostra tutte le pagine quando sono poche", () => {
    expect(pageNumbers(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it("con tante pagine mostra prima, ultima e le vicine, con i puntini in mezzo", () => {
    expect(pageNumbers(1, 20)).toEqual([1, 2, "…", 20]);
    expect(pageNumbers(10, 20)).toEqual([1, "…", 9, 10, 11, "…", 20]);
    expect(pageNumbers(20, 20)).toEqual([1, "…", 19, 20]);
  });
  it("non mette i puntini al posto di una sola pagina", () => {
    expect(pageNumbers(4, 20)).toEqual([1, 2, 3, 4, 5, "…", 20]);
  });
});
