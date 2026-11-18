import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Diritti GDPR del cliente sul database dei test end-to-end (geco_e2e): scaricare i dati, togliere il consenso al
 * marketing, cancellare l'account. Serve il database di `npm run dev` avviato; senza, il test viene saltato.
 */

vi.mock("server-only", () => ({}));

const URL_E2E = "postgres://postgres:postgres@127.0.0.1:54329/geco_e2e";
const postgres = (await import("postgres")).default;
const owner = postgres(URL_E2E, { max: 1, onnotice: () => {}, connect_timeout: 2 });
const UP = await owner`select 1`.then(
  () => true,
  () => false,
);

describe.skipIf(!UP)("dati del cliente (GDPR)", () => {
  let data: typeof import("./client-data");
  const leadsCreated: string[] = [];
  const usersCreated: string[] = [];

  async function user(email: string, verified: boolean) {
    const [{ id }] = await owner<{ id: string }[]>`
      insert into users (email, name, email_verified_at) values (${email}, 'Mario Prova', ${verified ? new Date() : null})
      returning id`;
    usersCreated.push(id);
    return id;
  }

  /** Una richiesta dell'email, copiata da una esistente. */
  async function lead(email: string, marketing = true) {
    const [{ id }] = await owner<{ id: string }[]>`
      insert into leads
      select * from jsonb_populate_record(null::leads, (select to_jsonb(l) from leads l limit 1)
        || jsonb_build_object('id', gen_random_uuid(), 'client_email', ${email}::text, 'client_name', 'Mario Prova',
             'client_phone', '+393331112233', 'description', 'Bagno da rifare', 'marketing_consent', ${marketing}::boolean,
             'follow_up_sent_at', null))
      returning id`;
    leadsCreated.push(id);
    return id;
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_E2E;
    data = await import("./client-data");
  });

  afterAll(async () => {
    if (leadsCreated.length) await owner`delete from leads where id in ${owner(leadsCreated)}`;
    if (usersCreated.length) await owner`delete from users where id in ${owner(usersCreated)}`;
    await owner.end();
  });

  it("scarica le richieste solo se l'email è confermata", async () => {
    const email = `gdpr-${crypto.randomUUID()}@example.com`;
    await lead(email);
    const unverified = await user(email, false);
    const out = await data.exportClientData(unverified);
    expect(out?.account.email).toBe(email);
    expect(out?.requests).toHaveLength(0);

    await owner`update users set email_verified_at = now() where id = ${unverified}`;
    const verified = await data.exportClientData(unverified);
    expect(verified?.requests).toHaveLength(1);
    expect(verified?.requests[0].phone).toBe("+393331112233");
  });

  it("toglie il consenso al marketing da tutte le richieste dell'email", async () => {
    const email = `gdpr-${crypto.randomUUID()}@example.com`;
    const id = await user(email, true);
    await lead(email);
    await lead(email);
    expect(await data.marketingConsentOf(email)).toBe(true);
    expect(await data.revokeMarketingConsent(id)).toBe(true);
    expect(await data.marketingConsentOf(email)).toBe(false);
  });

  it("cancella l'account e toglie nome e contatti dalle richieste", async () => {
    const email = `gdpr-${crypto.randomUUID()}@example.com`;
    const id = await user(email, true);
    const leadId = await lead(email);
    expect(await data.deleteClientAccount(id)).toBe("deleted");
    expect(await owner`select 1 from users where id = ${id}`).toHaveLength(0);
    const [row] = await owner`select client_name, client_email, client_phone, description, follow_up_sent_at from leads where id = ${leadId}`;
    expect(row.client_email).toBe("");
    expect(row.client_phone).toBe("");
    expect(row.description).toBeNull();
    expect(row.client_name).toBe("Cliente cancellato");
    expect(row.follow_up_sent_at).not.toBeNull();
  });

  it("con l'email non confermata non tocca le richieste di quell'indirizzo", async () => {
    const email = `gdpr-${crypto.randomUUID()}@example.com`;
    const id = await user(email, false);
    const leadId = await lead(email);
    expect(await data.deleteClientAccount(id)).toBe("deleted");
    const [row] = await owner`select client_email from leads where id = ${leadId}`;
    expect(row.client_email).toBe(email);
  });

  it("non cancella da sé chi gestisce un'azienda", async () => {
    const [m] = await owner<{ user_id: string }[]>`select user_id from partner_members limit 1`;
    expect(await data.deleteClientAccount(m.user_id)).toBe("partner");
  });
});
