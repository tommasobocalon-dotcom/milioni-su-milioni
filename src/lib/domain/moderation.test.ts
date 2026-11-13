import { describe, expect, it } from "vitest";
import { commentBan, nextSanctionLabel, sanctionFor, strikeEmail } from "./moderation";

const day = (n: number) => new Date(Date.UTC(2026, 10, n, 9, 0, 0));

describe("sanctionFor", () => {
  it("senza violazioni non c'è nessuna sanzione", () => {
    expect(sanctionFor([], day(13))).toEqual({ level: "none", strikes: 0 });
  });

  it("la prima violazione è solo un avviso", () => {
    expect(sanctionFor([day(10)], day(13))).toEqual({ level: "warning", strikes: 1 });
  });

  it("la seconda ferma i commenti per 7 giorni dalla seconda violazione", () => {
    expect(sanctionFor([day(1), day(10)], day(13))).toEqual({ level: "suspended", strikes: 2, until: day(17) });
    // Passati i 7 giorni si torna a commentare, ma le violazioni restano contate.
    expect(sanctionFor([day(1), day(10)], day(18))).toEqual({ level: "warning", strikes: 2 });
  });

  it("la terza li ferma per 30 giorni dalla terza violazione, in qualunque ordine arrivino le date", () => {
    expect(sanctionFor([day(10), day(1), day(5)], day(13))).toEqual({ level: "suspended", strikes: 3, until: new Date(Date.UTC(2026, 11, 10, 9, 0, 0)) });
  });

  it("dalla quarta i commenti sono bloccati, senza scadenza", () => {
    expect(sanctionFor([day(1), day(2), day(3), day(4)], day(13))).toEqual({ level: "blocked", strikes: 4 });
    expect(sanctionFor([day(1), day(2), day(3), day(4), day(5)], new Date(Date.UTC(2030, 0, 1)))).toEqual({ level: "blocked", strikes: 5 });
  });
});

describe("commentBan", () => {
  it("nessun divieto senza sanzione o con il solo avviso", () => {
    expect(commentBan({ level: "none", strikes: 0 })).toBeNull();
    expect(commentBan({ level: "warning", strikes: 1 })).toBeNull();
  });

  it("dice fino a quando, con la data in italiano", () => {
    expect(commentBan({ level: "suspended", strikes: 2, until: day(17) })).toBe(
      "Non puoi commentare fino al 17 novembre 2026: abbiamo tolto dei tuoi commenti perché contrari alle regole.",
    );
  });

  it("dice quando il blocco non ha scadenza", () => {
    expect(commentBan({ level: "blocked", strikes: 4 })).toBe("Non puoi più commentare: abbiamo tolto più volte dei tuoi commenti perché contrari alle regole.");
  });
});

describe("nextSanctionLabel", () => {
  it("dice all'amministratore cosa succede togliendo un altro commento", () => {
    expect(nextSanctionLabel(0)).toBe("avviso");
    expect(nextSanctionLabel(1)).toBe("stop ai commenti per 7 giorni");
    expect(nextSanctionLabel(2)).toBe("stop ai commenti per 30 giorni");
    expect(nextSanctionLabel(3)).toBe("blocco dei commenti");
    expect(nextSanctionLabel(9)).toBe("blocco dei commenti");
  });
});

describe("strikeEmail", () => {
  const base = { name: "Anna Verdi", body: "Comprate da me, costo meno", reasonLabel: "Spam o pubblicità", workTitle: "Scala in legno a Dolo", appUrl: "https://gecoitalia.it" };

  it("spiega cosa è stato tolto, perché, cosa comporta e come contestare", () => {
    const mail = strikeEmail({ ...base, sanction: { level: "warning", strikes: 1 } });
    expect(mail.subject).toBe("Abbiamo tolto un tuo commento su GecoItalia");
    expect(mail.text).toContain("Ciao Anna,");
    expect(mail.text).toContain("\"Comprate da me, costo meno\"");
    expect(mail.text).toContain("sotto il lavoro \"Scala in legno a Dolo\"");
    expect(mail.text).toContain("Motivo: Spam o pubblicità.");
    expect(mail.text).toContain("Per ora è solo un avviso");
    expect(mail.text).toContain("https://gecoitalia.it/assistenza");
    expect(mail.text).toContain("https://gecoitalia.it/termini");
  });

  it("con la sospensione dice fino a quando, con il blocco che non ha scadenza", () => {
    expect(strikeEmail({ ...base, sanction: { level: "suspended", strikes: 2, until: day(17) } }).text).toContain("non potrai commentare fino al 17 novembre 2026");
    expect(strikeEmail({ ...base, sanction: { level: "blocked", strikes: 4 } }).text).toContain("non potrai più commentare");
  });

  it("accorcia un commento lungo", () => {
    const mail = strikeEmail({ ...base, body: "x".repeat(400), sanction: { level: "warning", strikes: 1 } });
    expect(mail.text).toContain(`"${"x".repeat(200)}…"`);
  });
});
