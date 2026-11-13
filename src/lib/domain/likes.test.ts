import { describe, expect, it } from "vitest";
import { applyLike, likeLoginHref, likesLabel } from "./likes";

describe("likesLabel", () => {
  it("dice quando non ce ne sono ancora", () => {
    expect(likesLabel(0)).toBe("Ancora nessun mi piace");
  });

  it("non cambia tra singolare e plurale: \"mi piace\" resta uguale", () => {
    expect(likesLabel(1)).toBe("1 mi piace");
    expect(likesLabel(12)).toBe("12 mi piace");
  });

  it("separa le migliaia all'italiana (dalle cinque cifre, come vuole la regola)", () => {
    expect(likesLabel(1234)).toBe("1234 mi piace");
    expect(likesLabel(12345)).toBe("12.345 mi piace");
  });

  it("un numero negativo o non intero vale zero", () => {
    expect(likesLabel(-3)).toBe("Ancora nessun mi piace");
    expect(likesLabel(Number.NaN)).toBe("Ancora nessun mi piace");
  });
});

describe("applyLike", () => {
  it("mettere mi piace aggiunge uno", () => {
    expect(applyLike({ liked: false, count: 4 }, true)).toEqual({ liked: true, count: 5 });
  });

  it("toglierlo toglie uno", () => {
    expect(applyLike({ liked: true, count: 5 }, false)).toEqual({ liked: false, count: 4 });
  });

  it("ripetere la stessa scelta non cambia il conto (doppio clic)", () => {
    expect(applyLike({ liked: true, count: 5 }, true)).toEqual({ liked: true, count: 5 });
    expect(applyLike({ liked: false, count: 4 }, false)).toEqual({ liked: false, count: 4 });
  });

  it("il conto non scende mai sotto zero", () => {
    expect(applyLike({ liked: true, count: 0 }, false)).toEqual({ liked: false, count: 0 });
  });
});

describe("likeLoginHref", () => {
  it("manda all'accesso clienti e poi riporta al lavoro", () => {
    expect(likeLoginHref("/ispirazione/123")).toBe("/accedi?next=%2Fispirazione%2F123");
  });

  it("conserva i filtri della pagina", () => {
    expect(likeLoginHref("/ispirazione?tipo=agenzie&operazione=vendita")).toBe("/accedi?next=%2Fispirazione%3Ftipo%3Dagenzie%26operazione%3Dvendita");
  });

  it("un indirizzo esterno o strano torna a Ispirazione", () => {
    expect(likeLoginHref("https://altro.example/")).toBe("/accedi?next=%2Fispirazione");
    expect(likeLoginHref("//altro.example")).toBe("/accedi?next=%2Fispirazione");
  });
});
