import { describe, expect, it } from "vitest";
import { scrubEvent } from "./sentry";

describe("scrubEvent", () => {
  it("toglie cookie, intestazioni di accesso e indirizzo IP della richiesta", () => {
    const event = scrubEvent({
      request: {
        url: "https://gecoitalia.it/area-partner",
        cookies: { geco_session: "segreto" },
        headers: { cookie: "geco_session=segreto", authorization: "Basic abc", "user-agent": "Chrome", "x-forwarded-for": "93.40.1.2" },
      },
      user: { ip_address: "93.40.1.2", email: "mario@example.com", id: "u1" },
    });
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.headers).toEqual({ "user-agent": "Chrome" });
    expect(event.user).toEqual({ id: "u1" });
  });

  it("nasconde token e codici nei link (webhook, recupero password, Stripe)", () => {
    const event = scrubEvent({
      request: { url: "https://gecoitalia.it/api/assistenza/email?token=abc&x=1", query_string: "token=abc&x=1" },
    });
    expect(event.request?.url).toBe("https://gecoitalia.it/api/assistenza/email?token=%5Bnascosto%5D&x=1");
    expect(event.request?.query_string).toBe("token=%5Bnascosto%5D&x=1");
  });

  it("nasconde le email nel messaggio dell'errore", () => {
    const event = scrubEvent({ message: "Invio a mario.rossi@example.com non riuscito" });
    expect(event.message).toBe("Invio a [email] non riuscito");
  });

  it("nasconde i parametri delle query fallite e le email negli errori", () => {
    const event = scrubEvent({
      exception: {
        values: [
          { type: "Error", value: 'Failed query: insert into "leads" ("client_name", "client_email") values ($1, $2)\nparams: Mario Rossi,mario@example.com' },
          { type: "Error", value: "Utente luca@example.it non trovato" },
        ],
      },
    });
    expect(event.exception?.values?.map((v) => v.value)).toEqual([
      'Failed query: insert into "leads" ("client_name", "client_email") values ($1, $2)\nparams: [nascosti]',
      "Utente [email] non trovato",
    ]);
  });

  it("toglie il corpo della richiesta (dati dei moduli)", () => {
    const event = scrubEvent({ request: { url: "https://gecoitalia.it/richiesta", data: "nome=Mario&email=mario@example.com" } });
    expect(event.request?.data).toBeUndefined();
  });

  it("nasconde i token dei link scritti nel testo degli errori", () => {
    const event = scrubEvent({ message: "Link https://gecoitalia.it/accedi/nuova-password?token=abc123&per=azienda scaduto" });
    expect(event.message).toBe("Link https://gecoitalia.it/accedi/nuova-password?token=[nascosto]&per=azienda scaduto");
  });

  it("pulisce i breadcrumb: link con token, chiamate di rete e messaggi della console", () => {
    const event = scrubEvent({
      breadcrumbs: [
        { category: "navigation", data: { from: "/accedi", to: "/accedi/nuova-password?token=abc" } },
        { category: "fetch", data: { url: "https://gecoitalia.it/api/evento?email=mario@example.com", method: "GET", status_code: 500 } },
        {
          category: "console",
          message: "[assistenza] email non salvata: Failed query: insert into \"support_tickets\"\nparams: Mario Rossi,mario@example.com",
          data: { arguments: ["[assistenza] email non salvata:", { parameters: ["Mario Rossi", "mario@example.com"] }], logger: "console" },
        },
        { category: "ui.click", message: "button.invia" },
      ],
    });
    expect(event.breadcrumbs).toEqual([
      { category: "navigation", data: { from: "/accedi", to: "/accedi/nuova-password?token=%5Bnascosto%5D" } },
      { category: "fetch", data: { url: "https://gecoitalia.it/api/evento?email=%5Bnascosto%5D", method: "GET", status_code: 500 } },
      { category: "console", message: "[assistenza] email non salvata: Failed query: insert into \"support_tickets\"\nparams: [nascosti]", data: { logger: "console" } },
      { category: "ui.click", message: "button.invia" },
    ]);
  });

  it("lascia stare gli eventi senza richiesta", () => {
    expect(scrubEvent({ message: "errore" })).toEqual({ message: "errore" });
  });
});
