import { describe, expect, it } from "vitest";
import { databaseSsl, databaseUrl } from "./url";

describe("databaseUrl", () => {
  it("senza variabili usa il database locale di npm run dev", () => {
    expect(databaseUrl({})).toBe("postgres://postgres:postgres@127.0.0.1:54329/postgres");
  });

  it("DATABASE_URL ha la precedenza", () => {
    expect(databaseUrl({ DATABASE_URL: "postgres://a:b@db:5432/x", POSTGRES_URL: "postgres://c:d@other:6543/y" })).toBe(
      "postgres://a:b@db:5432/x",
    );
  });

  it("su Vercel usa POSTGRES_URL dell'integrazione Supabase senza il parametro supa", () => {
    expect(
      databaseUrl({
        POSTGRES_URL: "postgres://postgres.ref:p%40ss@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x",
      }),
    ).toBe("postgres://postgres.ref:p%40ss@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require");
  });
});

describe("databaseSsl", () => {
  const SUPABASE = "postgres://postgres.ref:pw@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
  const PEM = "-----BEGIN CERTIFICATE-----\nMIIDxzCCAq+gAwIBAgIU\n-----END CERTIFICATE-----";

  it("il database locale non usa TLS", () => {
    expect(databaseSsl("postgres://postgres:postgres@127.0.0.1:54329/postgres", {})).toBe(false);
    expect(databaseSsl("postgres://postgres:postgres@localhost:5432/postgres", {})).toBe(false);
  });

  it("senza certificato la connessione è comunque cifrata", () => {
    expect(databaseSsl(SUPABASE, {})).toBe("require");
  });

  it("con DATABASE_CA_CERT verifica il certificato del server e il suo nome (verify-full)", () => {
    expect(databaseSsl(SUPABASE, { DATABASE_CA_CERT: PEM })).toEqual({ ca: PEM, rejectUnauthorized: true });
  });

  it("accetta il certificato incollato su una riga con \\n al posto degli a capo", () => {
    const oneLine = PEM.replaceAll("\n", "\\n");
    expect(databaseSsl(SUPABASE, { DATABASE_CA_CERT: ` ${oneLine} ` })).toEqual({ ca: PEM, rejectUnauthorized: true });
  });

  it("si ferma se DATABASE_CA_CERT non è un certificato", () => {
    expect(() => databaseSsl(SUPABASE, { DATABASE_CA_CERT: "prod-ca-2021.crt" })).toThrow(/DATABASE_CA_CERT/);
  });
});
