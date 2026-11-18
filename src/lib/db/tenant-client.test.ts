import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * RLS dell'Area cliente e del profilo dell'azienda (migrazione 0032) sul database dei test end-to-end (geco_e2e).
 * Serve il database di `npm run dev` avviato; senza, il test viene saltato.
 */

vi.mock("server-only", () => ({}));

const URL_E2E = "postgres://postgres:postgres@127.0.0.1:54329/geco_e2e";
const postgres = (await import("postgres")).default;
const owner = postgres(URL_E2E, { max: 1, onnotice: () => {}, connect_timeout: 2 });
const UP = await owner`select 1`.then(
  () => true,
  () => false,
);

describe.skipIf(!UP)("RLS dell'Area cliente e del profilo dell'azienda", () => {
  let tenant: typeof import("./tenant");
  let schema: typeof import("./schema");
  let eq: typeof import("drizzle-orm").eq;
  const mine = `rls-${crypto.randomUUID()}@example.com`;
  const other = `rls-${crypto.randomUUID()}@example.com`;
  let me: string;
  let stranger: string;
  let myLead: string;
  let otherLead: string;
  let ticket: string;

  /** Una richiesta dell'email, copiata da una esistente, con una nota interna dell'azienda. */
  async function lead(email: string) {
    const [{ id }] = await owner<{ id: string }[]>`
      insert into leads
      select * from jsonb_populate_record(null::leads, (select to_jsonb(l) from leads l limit 1)
        || jsonb_build_object('id', gen_random_uuid(), 'client_email', ${email}::text, 'client_name', 'Cliente RLS',
             'notes', 'nota interna', 'marketing_consent', true))
      returning id`;
    return id;
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_E2E;
    tenant = await import("./tenant");
    schema = await import("./schema");
    ({ eq } = await import("drizzle-orm"));
    [{ id: me }] = await owner<{ id: string }[]>`insert into users (email, name, email_verified_at) values (${mine}, 'Io', now()) returning id`;
    [{ id: stranger }] = await owner<{ id: string }[]>`insert into users (email, name, email_verified_at) values (${other}, 'Altro', now()) returning id`;
    myLead = await lead(mine);
    otherLead = await lead(other);
    [{ id: ticket }] = await owner<{ id: string }[]>`
      insert into support_tickets (subject, channel, requester_name, requester_email, user_id) values ('Aiuto', 'web', 'Io', ${mine}, ${me}) returning id`;
    await owner`insert into support_messages (ticket_id, kind, author_name, body) values
      (${ticket}, 'inbound', 'Io', 'domanda'), (${ticket}, 'note', 'Team', 'nota del team')`;
  });

  afterAll(async () => {
    if (myLead) await owner`delete from leads where id in (${myLead}, ${otherLead})`;
    if (ticket) await owner`delete from support_tickets where id = ${ticket}`;
    if (me) await owner`delete from users where id in (${me}, ${stranger})`;
    await owner.end();
  });

  it("il cliente vede le richieste della propria email e nessun'altra, anche senza filtro", async () => {
    const rows = await tenant.asClient(me, (tx) => tx.select({ id: schema.leads.id }).from(schema.leads));
    expect(rows.map((r) => r.id)).toEqual([myLead]);
  });

  it("con l'email non confermata non vede richieste", async () => {
    await owner`update users set email_verified_at = null where id = ${me}`;
    try {
      const rows = await tenant.asClient(me, (tx) => tx.select({ id: schema.leads.id }).from(schema.leads));
      expect(rows).toEqual([]);
    } finally {
      await owner`update users set email_verified_at = now() where id = ${me}`;
    }
  });

  it("legge solo il proprio account, senza password, sessioni né note interne delle aziende", async () => {
    const accounts = await tenant.asClient(me, (tx) => tx.select({ id: schema.users.id }).from(schema.users));
    expect(accounts.map((r) => r.id)).toEqual([me]);
    await expect(tenant.asClient(me, (tx) => tx.select({ hash: schema.users.passwordHash }).from(schema.users))).rejects.toThrow();
    await expect(tenant.asClient(me, (tx) => tx.select({ notes: schema.leads.notes }).from(schema.leads))).rejects.toThrow();
    await expect(tenant.asClient(me, (tx) => tx.select().from(schema.sessions).limit(1))).rejects.toThrow();
  });

  it("delle aziende vede solo il nome di quelle a cui ha scritto", async () => {
    const companies = await tenant.asClient(me, (tx) => tx.select({ id: schema.partners.id }).from(schema.partners));
    const [{ partner_id }] = await owner<{ partner_id: string }[]>`select partner_id from leads where id = ${myLead}`;
    expect(companies.map((c) => c.id)).toEqual([partner_id]);
    await expect(tenant.asClient(me, (tx) => tx.select({ vat: schema.partners.vatNumber }).from(schema.partners))).rejects.toThrow();
  });

  it("toglie il consenso solo dalle proprie richieste e non può cambiare altro", async () => {
    const changed = await tenant.asClient(me, (tx) =>
      tx.update(schema.leads).set({ marketingConsent: false }).where(eq(schema.leads.id, otherLead)).returning({ id: schema.leads.id }),
    );
    expect(changed).toEqual([]);
    const [row] = await owner<{ marketing_consent: boolean }[]>`select marketing_consent from leads where id = ${otherLead}`;
    expect(row.marketing_consent).toBe(true);
    await expect(tenant.asClient(me, (tx) => tx.update(schema.leads).set({ clientName: "cambiato" }).where(eq(schema.leads.id, myLead)))).rejects.toThrow();
  });

  it("vede i propri ticket senza le note del team, e nessuno quelli degli altri", async () => {
    const messages = await tenant.asClient(me, (tx) => tx.select({ kind: schema.supportMessages.kind }).from(schema.supportMessages));
    expect(messages.map((m) => m.kind)).toEqual(["inbound"]);
    const tickets = await tenant.asClient(stranger, (tx) => tx.select({ id: schema.supportTickets.id }).from(schema.supportTickets));
    expect(tickets).toEqual([]);
  });

  it("l'azienda modifica le colonne del profilo ma non stato dell'account né indirizzo della scheda", async () => {
    const [{ id, tagline }] = await owner<{ id: string; tagline: string | null }[]>`select id, tagline from partners limit 1`;
    try {
      await tenant.asPartner(id, (tx) => tx.update(schema.partners).set({ tagline: "dalla RLS" }).where(eq(schema.partners.id, id)));
      const [row] = await owner<{ tagline: string }[]>`select tagline from partners where id = ${id}`;
      expect(row.tagline).toBe("dalla RLS");
      await expect(tenant.asPartner(id, (tx) => tx.update(schema.partners).set({ accountStatus: "active" }).where(eq(schema.partners.id, id)))).rejects.toThrow();
      await expect(tenant.asPartner(id, (tx) => tx.update(schema.partners).set({ slug: "rubato" }).where(eq(schema.partners.id, id)))).rejects.toThrow();
    } finally {
      await owner`update partners set tagline = ${tagline} where id = ${id}`;
    }
  });
});
