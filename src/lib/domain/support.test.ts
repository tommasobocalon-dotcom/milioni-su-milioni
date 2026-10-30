import { describe, expect, it } from "vitest";
import {
  cleanSubject,
  htmlToText,
  isAutomatedSender,
  parseAddress,
  parseEmailList,
  parseInboundEmail,
  replySubject,
  statusAfter,
  stripQuotedReply,
  ticketNumberFromSubject,
  ticketTag,
} from "./support";

describe("numero del ticket nell'oggetto", () => {
  it("si scrive e si rilegge", () => {
    expect(ticketTag(42)).toBe("[geco #42]");
    expect(ticketNumberFromSubject("Re: Fattura di ottobre [geco #42]")).toBe(42);
    expect(ticketNumberFromSubject("R: [GECO #7] problema")).toBe(7);
  });

  it("senza etichetta non c'è numero", () => {
    expect(ticketNumberFromSubject("Problema con la fattura #42")).toBeNull();
  });

  it("la risposta ha un solo Re: e una sola etichetta", () => {
    expect(replySubject("Re: R: Fattura di ottobre [geco #42]", 42)).toBe("Re: Fattura di ottobre [geco #42]");
    expect(replySubject("", 3)).toBe("Re: Richiesta di assistenza [geco #3]");
  });

  it("l'oggetto pulito toglie prefissi ed etichetta", () => {
    expect(cleanSubject("Fwd: I:  Non riesco ad accedere [geco #9] ")).toBe("Non riesco ad accedere");
  });
});

describe("pulizia delle risposte email", () => {
  it("toglie la citazione di Gmail in italiano, anche spezzata su due righe", () => {
    const text = "Grazie, ora funziona.\n\nIl giorno gio 30 ott 2026 alle ore 10:15 Assistenza geco <\nassistenza@gecoitalia.it> ha scritto:\n> Prova a reimpostare la password";
    expect(stripQuotedReply(text)).toBe("Grazie, ora funziona.");
  });

  it("toglie la citazione inglese e quella di Outlook", () => {
    expect(stripQuotedReply("Ok!\nOn Mon, 3 Nov 2026 at 10:00, geco <a@b.it> wrote:\n> ciao")).toBe("Ok!");
    expect(stripQuotedReply("Va bene\n\nDa: geco <a@b.it>\nInviato: lunedì 3 novembre\nOggetto: x")).toBe("Va bene");
  });

  it("toglie le righe citate con >", () => {
    expect(stripQuotedReply("Sì\n> domanda\n>> vecchia\nGrazie")).toBe("Sì\nGrazie");
  });

  it("se resta vuoto tiene il testo originale", () => {
    expect(stripQuotedReply("> solo citazione")).toBe("> solo citazione");
  });
});

describe("indirizzi email", () => {
  it("legge nome e indirizzo", () => {
    expect(parseAddress("Mario Rossi <Mario@Rossi.IT>")).toEqual({ email: "mario@rossi.it", name: "Mario Rossi" });
    expect(parseAddress('"Rossi, Mario" <mario@rossi.it>')).toEqual({ email: "mario@rossi.it", name: "Rossi, Mario" });
    expect(parseAddress("mario@rossi.it")).toEqual({ email: "mario@rossi.it", name: null });
  });

  it("rifiuta quello che non è un'email", () => {
    expect(parseAddress("Mario Rossi")).toBeNull();
    expect(parseAddress("<>")).toBeNull();
  });

  it("riconosce i mittenti automatici e la nostra casella", () => {
    expect(isAutomatedSender("noreply@stripe.com", [])).toBe(true);
    expect(isAutomatedSender("no-reply+abc@example.com", [])).toBe(true);
    expect(isAutomatedSender("MAILER-DAEMON@mx.example.com", [])).toBe(true);
    expect(isAutomatedSender("assistenza@gecoitalia.it", ["Assistenza@gecoitalia.it"])).toBe(true);
    expect(isAutomatedSender("mario@rossi.it", ["assistenza@gecoitalia.it"])).toBe(false);
  });

  it("legge l'elenco degli amministratori", () => {
    expect(parseEmailList(" A@x.it, b@y.it;non-email  c@z.it ")).toEqual(["a@x.it", "b@y.it", "c@z.it"]);
    expect(parseEmailList(undefined)).toEqual([]);
  });
});

describe("email in arrivo", () => {
  it("formato Postmark, con la risposta già ripulita dal provider", () => {
    const mail = parseInboundEmail({
      From: "mario@rossi.it",
      FromName: "Mario Rossi",
      FromFull: { Email: "mario@rossi.it", Name: "Mario Rossi" },
      Subject: "Re: Fattura [geco #12]",
      TextBody: "Grazie\n> vecchio",
      StrippedTextReply: "Grazie",
      MessageID: "abc-123",
    });
    expect(mail).toEqual({ fromEmail: "mario@rossi.it", fromName: "Mario Rossi", subject: "Re: Fattura [geco #12]", text: "Grazie", messageId: "abc-123" });
  });

  it("formato Resend o inoltro generico, anche solo HTML", () => {
    const mail = parseInboundEmail({
      from: "Giulia <giulia@example.com>",
      subject: "Non ricevo i lead",
      html: "<p>Buongiorno,</p><p>non ricevo i lead &amp; le email.</p>",
      message_id: "<m1@example.com>",
    });
    expect(mail).toEqual({
      fromEmail: "giulia@example.com",
      fromName: "Giulia",
      subject: "Non ricevo i lead",
      text: "Buongiorno,\nnon ricevo i lead & le email.",
      messageId: "<m1@example.com>",
    });
  });

  it("scarta email senza mittente valido o vuote", () => {
    expect(parseInboundEmail({ from: "nessuno", text: "ciao" })).toBeNull();
    expect(parseInboundEmail({ from: "a@b.it", subject: " ", text: "" })).toBeNull();
    expect(parseInboundEmail("testo")).toBeNull();
  });

  it("taglia le email lunghissime", () => {
    const mail = parseInboundEmail({ from: "a@b.it", subject: "x", text: "a".repeat(30_000) });
    expect(mail?.text.length).toBe(20_000);
  });
});

describe("html in testo", () => {
  it("toglie stili e tag, tiene gli a capo", () => {
    expect(htmlToText("<style>p{}</style><div>Uno<br>Due</div>Tre&nbsp;quattro")).toBe("Uno\nDue\nTre quattro");
  });
});

describe("stato del ticket dopo un messaggio", () => {
  it("chi chiede riapre, la risposta mette in attesa, la nota non cambia", () => {
    expect(statusAfter("resolved", "inbound")).toBe("open");
    expect(statusAfter("open", "reply")).toBe("waiting");
    expect(statusAfter("waiting", "note")).toBe("waiting");
  });
});
