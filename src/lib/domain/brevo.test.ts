import { describe, expect, it } from "vitest";
import { brevoEmailRequest, brevoSmsRequest } from "./brevo";

describe("brevoSmsRequest", () => {
  it("SMS transazionale al numero senza +, con il mittente indicato", () => {
    const r = brevoSmsRequest({ apiKey: "k", sender: "geco", to: "+393475551218", text: "Codice 123456" });
    expect(r.url).toBe("https://api.brevo.com/v3/transactionalSMS/sms");
    expect(r.init.method).toBe("POST");
    expect(r.init.headers).toMatchObject({ "api-key": "k", "content-type": "application/json" });
    expect(JSON.parse(r.init.body as string)).toEqual({ type: "transactional", sender: "geco", recipient: "393475551218", content: "Codice 123456" });
  });

  it("mittente alfanumerico oltre 11 caratteri: errore di configurazione", () => {
    expect(() => brevoSmsRequest({ apiKey: "k", sender: "gecoitalia-sms", to: "+39347", text: "x" })).toThrow(/11/);
  });
});

describe("brevoEmailRequest", () => {
  it("email di solo testo dal mittente configurato", () => {
    const r = brevoEmailRequest({ apiKey: "k", from: "info@gecoitalia.it", fromName: "geco", to: "mario@example.com", subject: "Ciao", text: "Testo" });
    expect(r.url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(r.init.headers).toMatchObject({ "api-key": "k" });
    expect(JSON.parse(r.init.body as string)).toEqual({
      sender: { email: "info@gecoitalia.it", name: "geco" },
      to: [{ email: "mario@example.com" }],
      subject: "Ciao",
      textContent: "Testo",
    });
  });
});
