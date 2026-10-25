import { describe, expect, it } from "vitest";
import { databaseUrl } from "./url";

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
