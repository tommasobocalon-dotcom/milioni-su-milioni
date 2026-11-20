import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Accesso con Google/Apple su un account che esiste già con la stessa email (userForOAuthProfile), sul database dei
 * test end-to-end (geco_e2e). Serve il database di `npm run dev` avviato; senza, il test viene saltato.
 */

vi.mock("server-only", () => ({}));

const URL_E2E = "postgres://postgres:postgres@127.0.0.1:54329/geco_e2e";
const postgres = (await import("postgres")).default;
const owner = postgres(URL_E2E, { max: 1, onnotice: () => {}, connect_timeout: 2 });
const UP = await owner`select 1`.then(
  () => true,
  () => false,
);

describe.skipIf(!UP)("collegamento di Google/Apple a un account esistente", () => {
  let oauth: typeof import("./oauth");
  const usersCreated: string[] = [];

  async function passwordAccount(email: string, verified: boolean) {
    const [{ id }] = await owner<{ id: string }[]>`
      insert into users (email, name, password_hash, email_verified_at)
      values (${email}, 'Chi si è registrato', 'scrypt$finto', ${verified ? new Date() : null})
      returning id`;
    usersCreated.push(id);
    // Una sessione aperta, come dopo la registrazione.
    await owner`insert into sessions (id, user_id, expires_at) values (${`prova-${id}`}, ${id}, now() + interval '1 day')`;
    return id;
  }

  const profile = (email: string) => ({ provider: "google" as const, subject: `sub-${email}`, email, emailVerified: true, name: "Proprietaria vera" });

  const state = async (id: string) => {
    const [u] = await owner<{ password_hash: string | null; email_verified_at: Date | null }[]>`
      select password_hash, email_verified_at from users where id = ${id}`;
    const [{ n }] = await owner<{ n: number }[]>`select count(*)::int as n from sessions where user_id = ${id}`;
    return { password: u.password_hash, verified: !!u.email_verified_at, sessions: n };
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_E2E;
    oauth = await import("./oauth");
  });

  afterAll(async () => {
    if (usersCreated.length) await owner`delete from users where id in ${owner(usersCreated)}`;
    await owner.end();
  });

  it("su un account mai confermato toglie password e sessioni di chi l'aveva creato (furto preparato in anticipo)", async () => {
    const email = `prova-oauth-${Date.now()}@example.com`;
    const id = await passwordAccount(email, false);
    expect(await oauth.userForOAuthProfile(profile(email))).toBe(id);
    expect(await state(id)).toEqual({ password: null, verified: true, sessions: 0 });
  });

  it("su un account con l'email già confermata lascia password e sessioni", async () => {
    const email = `prova-oauth-ok-${Date.now()}@example.com`;
    const id = await passwordAccount(email, true);
    expect(await oauth.userForOAuthProfile(profile(email))).toBe(id);
    expect(await state(id)).toEqual({ password: "scrypt$finto", verified: true, sessions: 1 });
  });
});
