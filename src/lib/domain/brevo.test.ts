import { describe, expect, it } from "vitest";
import { brevoEmailRequest } from "./brevo";

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
