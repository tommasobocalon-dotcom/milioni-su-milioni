import { describe, expect, it } from "vitest";
import { describeError } from "./log";

describe("describeError", () => {
  it("nasconde i parametri delle query e i dettagli del database, tiene tipo, messaggio e stack", () => {
    const cause = Object.assign(new Error('duplicate key value violates unique constraint "users_email_unique"'), {
      name: "PostgresError",
      code: "23505",
      detail: "Key (email)=(mario@example.com) already exists.",
      parameters: ["mario@example.com"],
    });
    const e = new Error('Failed query: insert into "users" ("email") values ($1)\nparams: mario@example.com', { cause });
    const text = describeError(e);
    expect(text).toContain('Error: Failed query: insert into "users" ("email") values ($1)\nparams: [nascosti]');
    expect(text).toContain('Causa: PostgresError [23505]: duplicate key value violates unique constraint "users_email_unique"');
    expect(text).toMatch(/\n {4}at /);
    expect(text).not.toContain("mario@example.com");
  });

  it("nasconde le email nei messaggi e nei valori che non sono errori", () => {
    expect(describeError(new Error("Utente luca@example.it non trovato"))).toMatch(/^Error: Utente \[email\] non trovato/);
    expect(describeError("invio a luca@example.it non riuscito")).toBe("invio a [email] non riuscito");
    expect(describeError({ to: "luca@example.it", status: 400 })).toBe("[oggetto non stampato]");
    expect(describeError(undefined)).toBe("");
  });
});
