import { describe, expect, it } from "vitest";
import {
  COMMENT_MAX,
  REPORT_AUTO_HOLD,
  cleanComment,
  commentError,
  commentsLabel,
  hasHiddenWord,
  initialCommentStatus,
  parseHiddenWords,
  publicAuthorName,
  tooManyComments,
  visibleTo,
} from "./comments";

describe("cleanComment", () => {
  it("toglie gli spazi ai bordi e quelli doppi, tiene al massimo una riga vuota", () => {
    expect(cleanComment("  Bel   lavoro \n\n\n\n complimenti  ")).toBe("Bel lavoro\n\ncomplimenti");
  });

  it("un valore che non è testo diventa vuoto", () => {
    expect(cleanComment(null)).toBe("");
    expect(cleanComment(undefined)).toBe("");
  });
});

describe("commentError", () => {
  it("accetta un commento normale", () => {
    expect(commentError("Che piastrelle avete usato per il pavimento?")).toBeNull();
  });

  it("vuole un testo", () => {
    expect(commentError("")).toBe("Scrivi un commento");
  });

  it("ha un massimo di caratteri", () => {
    expect(commentError("a".repeat(COMMENT_MAX))).toBeNull();
    expect(commentError("a".repeat(COMMENT_MAX + 1))).toBe(`Al massimo ${COMMENT_MAX} caratteri`);
  });

  it("niente link, in nessuna forma (antispam)", () => {
    const msg = "Nei commenti non si possono mettere link";
    expect(commentError("Guarda qui https://esempio.it/offerta")).toBe(msg);
    expect(commentError("visita www.esempio.com")).toBe(msg);
    expect(commentError("scrivimi su esempio.it")).toBe(msg);
    expect(commentError("Sconti su Guadagni-Facili.NET oggi")).toBe(msg);
  });

  it("un punto senza spazio o un numero con i decimali non sono link", () => {
    expect(commentError("Bello.Complimenti davvero")).toBeNull();
    expect(commentError("Il bagno è di 4.5 metri quadri, giusto?")).toBeNull();
    expect(commentError("Ottimo lavoro... bravi")).toBeNull();
  });
});

describe("hasHiddenWord", () => {
  const words = ["truffa", "ladri", "fate schifo"];

  it("trova la parola intera, senza badare a maiuscole e accenti", () => {
    expect(hasHiddenWord("Questa è una TRUFFA", words)).toBe(true);
    expect(hasHiddenWord("siete dei làdri", words)).toBe(true);
  });

  it("trova anche le frasi", () => {
    expect(hasHiddenWord("secondo me fate   schifo", words)).toBe(true);
  });

  it("non scatta su parole che la contengono soltanto", () => {
    expect(hasHiddenWord("i truffatori non mi piacciono", words)).toBe(false);
    expect(hasHiddenWord("che bella cazzuola nuova", ["cazzo"])).toBe(false);
  });

  it("riconosce i trucchi più comuni: lettere ripetute e numeri al posto delle lettere", () => {
    expect(hasHiddenWord("che truuuuffa", words)).toBe(true);
    expect(hasHiddenWord("tr0ff4? no: truff4", words)).toBe(true);
    expect(hasHiddenWord("l4dr1", words)).toBe(true);
  });

  it("senza elenco non trova nulla", () => {
    expect(hasHiddenWord("qualsiasi cosa", [])).toBe(false);
  });
});

describe("parseHiddenWords", () => {
  it("una parola o frase per riga o separate da virgola, minuscole, senza doppioni né righe vuote", () => {
    expect(parseHiddenWords("Truffa, ladri\n\n  Fate schifo \ntruffa")).toEqual(["truffa", "ladri", "fate schifo"]);
  });

  it("scarta le voci troppo corte o troppo lunghe e tiene al massimo 100 voci", () => {
    expect(parseHiddenWords("a\nok\n" + "x".repeat(41))).toEqual(["ok"]);
    expect(parseHiddenWords(Array.from({ length: 150 }, (_, i) => `parola${i}`).join("\n"))).toHaveLength(100);
  });
});

describe("initialCommentStatus", () => {
  const base = ["idiota"];

  it("di norma il commento si vede subito", () => {
    expect(initialCommentStatus({ body: "Bel lavoro", baseWords: base, partnerWords: [], limited: false })).toBe("visible");
  });

  it("con una parola dell'elenco di base o di quello dell'azienda aspetta l'approvazione", () => {
    expect(initialCommentStatus({ body: "sei un idiota", baseWords: base, partnerWords: [], limited: false })).toBe("pending");
    expect(initialCommentStatus({ body: "prezzi da ladri", baseWords: base, partnerWords: ["ladri"], limited: false })).toBe("pending");
  });

  it("chi è stato limitato dall'azienda aspetta sempre l'approvazione", () => {
    expect(initialCommentStatus({ body: "Bel lavoro", baseWords: base, partnerWords: [], limited: true })).toBe("pending");
  });
});

describe("tooManyComments", () => {
  it("al massimo 5 al minuto e 30 al giorno", () => {
    expect(tooManyComments({ lastMinute: 4, lastDay: 10 })).toBe(false);
    expect(tooManyComments({ lastMinute: 5, lastDay: 10 })).toBe(true);
    expect(tooManyComments({ lastMinute: 0, lastDay: 29 })).toBe(false);
    expect(tooManyComments({ lastMinute: 0, lastDay: 30 })).toBe(true);
  });
});

describe("visibleTo", () => {
  const c = (status: "visible" | "pending" | "hidden" | "removed", authorBlocked = false) => ({ status, authorId: "autore", authorBlocked });

  it("tutti vedono i commenti visibili di chi non è bloccato", () => {
    expect(visibleTo(c("visible"), { userId: null, moderator: false })).toBe(true);
    expect(visibleTo(c("visible", true), { userId: "altro", moderator: false })).toBe(false);
  });

  it("in attesa o nascosti li vedono solo l'autore e l'azienda", () => {
    for (const status of ["pending", "hidden"] as const) {
      expect(visibleTo(c(status), { userId: null, moderator: false })).toBe(false);
      expect(visibleTo(c(status), { userId: "altro", moderator: false })).toBe(false);
      expect(visibleTo(c(status), { userId: "autore", moderator: false })).toBe(true);
      expect(visibleTo(c(status), { userId: "azienda", moderator: true })).toBe(true);
    }
  });

  it("l'azienda vede anche quelli di chi ha bloccato, per poterlo sbloccare", () => {
    expect(visibleTo(c("visible", true), { userId: "azienda", moderator: true })).toBe(true);
  });

  it("quelli tolti dalla piattaforma li vede solo l'autore", () => {
    expect(visibleTo(c("removed"), { userId: "azienda", moderator: true })).toBe(false);
    expect(visibleTo(c("removed"), { userId: "autore", moderator: false })).toBe(true);
  });
});

describe("publicAuthorName", () => {
  it("nome e iniziale del cognome", () => {
    expect(publicAuthorName("Mario Rossi")).toBe("Mario R.");
    expect(publicAuthorName("  anna   maria  de luca ")).toBe("Anna L.");
  });

  it("un nome solo resta com'è, uno vuoto diventa \"Utente\"", () => {
    expect(publicAuthorName("Giulia")).toBe("Giulia");
    expect(publicAuthorName("  ")).toBe("Utente");
  });

  it("non mostra mai un indirizzo email usato come nome", () => {
    expect(publicAuthorName("mario.rossi@example.com")).toBe("Utente");
  });
});

describe("commentsLabel e soglia delle segnalazioni", () => {
  it("singolare, plurale e nessuno", () => {
    expect(commentsLabel(0)).toBe("Nessun commento");
    expect(commentsLabel(1)).toBe("1 commento");
    expect(commentsLabel(8)).toBe("8 commenti");
  });

  it("dopo tre segnalazioni di persone diverse il commento va in attesa", () => {
    expect(REPORT_AUTO_HOLD).toBe(3);
  });
});
