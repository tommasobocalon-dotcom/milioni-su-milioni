import { describe, expect, it } from "vitest";
import { applyFollow, followLoginHref, followersLabel } from "./follows";

describe("followersLabel", () => {
  it("dice quando non ce ne sono ancora", () => {
    expect(followersLabel(0)).toBe("Ancora nessun follower");
  });

  it("\"follower\" resta uguale al singolare e al plurale", () => {
    expect(followersLabel(1)).toBe("1 follower");
    expect(followersLabel(37)).toBe("37 follower");
    expect(followersLabel(12345)).toBe("12.345 follower");
  });

  it("un numero negativo o non valido vale zero", () => {
    expect(followersLabel(-1)).toBe("Ancora nessun follower");
    expect(followersLabel(Number.NaN)).toBe("Ancora nessun follower");
  });
});

describe("applyFollow", () => {
  it("seguire aggiunge un follower, smettere lo toglie", () => {
    expect(applyFollow({ following: false, count: 9 }, true)).toEqual({ following: true, count: 10 });
    expect(applyFollow({ following: true, count: 10 }, false)).toEqual({ following: false, count: 9 });
  });

  it("ripetere la stessa scelta non cambia il conto", () => {
    expect(applyFollow({ following: true, count: 10 }, true)).toEqual({ following: true, count: 10 });
    expect(applyFollow({ following: false, count: 0 }, false)).toEqual({ following: false, count: 0 });
  });

  it("il conto non scende mai sotto zero", () => {
    expect(applyFollow({ following: true, count: 0 }, false)).toEqual({ following: false, count: 0 });
  });
});

describe("followLoginHref", () => {
  it("manda all'accesso clienti e poi riporta alla pagina", () => {
    expect(followLoginHref("/professionisti/padova/idraulico/rossi-impianti")).toBe("/accedi?next=%2Fprofessionisti%2Fpadova%2Fidraulico%2Frossi-impianti");
  });

  it("un indirizzo esterno torna a Ispirazione", () => {
    expect(followLoginHref("https://altro.example/")).toBe("/accedi?next=%2Fispirazione");
  });
});
