import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * RLS dell'Area Partner sul database dei test end-to-end (geco_e2e): dentro asPartner il database stesso mostra e
 * lascia modificare solo le righe dell'azienda della sessione, anche se la query dimentica il filtro. Serve il
 * database di `npm run dev` avviato; senza, il test viene saltato.
 */

vi.mock("server-only", () => ({}));

const URL_E2E = "postgres://postgres:postgres@127.0.0.1:54329/geco_e2e";
const postgres = (await import("postgres")).default;
const owner = postgres(URL_E2E, { max: 1, onnotice: () => {}, connect_timeout: 2 });
const UP = await owner`select 1`.then(
  () => true,
  () => false,
);

describe.skipIf(!UP)("asPartner: isolamento tra aziende nel database", () => {
  let tenant: typeof import("./tenant");
  let schema: typeof import("./schema");
  let a: string;
  let b: string;
  let leadOfB: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_E2E;
    tenant = await import("./tenant");
    schema = await import("./schema");
    [{ partner_id: a }] = await owner<{ partner_id: string }[]>`select partner_id from leads limit 1`;
    [{ id: b }] = await owner<{ id: string }[]>`select id from partners where id <> ${a} limit 1`;
    // Una richiesta dell'azienda B, copiata da una esistente.
    [{ id: leadOfB }] = await owner<{ id: string }[]>`
      insert into leads
      select * from jsonb_populate_record(null::leads, (select to_jsonb(l) from leads l limit 1)
        || jsonb_build_object('id', gen_random_uuid(), 'partner_id', ${b}::uuid, 'notes', 'nota di B'))
      returning id`;
    await owner`insert into lead_events (lead_id, type, message, actor) values (${leadOfB}, 'seen', 'evento di B', 'test')`;
  });

  afterAll(async () => {
    if (leadOfB) await owner`delete from leads where id = ${leadOfB}`;
    await owner.end();
  });

  it("vede solo le richieste della propria azienda, anche senza filtro", async () => {
    const rows = await tenant.asPartner(a, (tx) => tx.select({ partnerId: schema.leads.partnerId }).from(schema.leads));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.partnerId === a)).toBe(true);
  });

  it("non legge né modifica richieste ed eventi di un'altra azienda", async () => {
    const { eq } = await import("drizzle-orm");
    const changed = await tenant.asPartner(a, (tx) =>
      tx.update(schema.leads).set({ notes: "scritto da A" }).where(eq(schema.leads.id, leadOfB)).returning({ id: schema.leads.id }),
    );
    expect(changed).toEqual([]);
    const events = await tenant.asPartner(a, (tx) => tx.select().from(schema.leadEvents).where(eq(schema.leadEvents.leadId, leadOfB)));
    expect(events).toEqual([]);
    const [row] = await owner<{ notes: string }[]>`select notes from leads where id = ${leadOfB}`;
    expect(row.notes).toBe("nota di B");
  });

  it("non può spostare una propria riga su un'altra azienda", async () => {
    const { eq } = await import("drizzle-orm");
    await expect(
      tenant.asPartner(a, (tx) => tx.update(schema.partnerServices).set({ partnerId: b }).where(eq(schema.partnerServices.partnerId, a))),
    ).rejects.toThrow();
  });

  it("legge i dati di riferimento ma non utenti e sessioni", async () => {
    const towns = await tenant.asPartner(a, (tx) => tx.select({ id: schema.municipalities.id }).from(schema.municipalities).limit(1));
    expect(towns).toHaveLength(1);
    await expect(tenant.asPartner(a, (tx) => tx.select().from(schema.users).limit(1))).rejects.toThrow();
    await expect(tenant.asPartner(a, (tx) => tx.select().from(schema.sessions).limit(1))).rejects.toThrow();
  });

  it("finita asPartner, la connessione torna al ruolo dell'app", async () => {
    const { db } = await import("./client");
    const { sql } = await import("drizzle-orm");
    await tenant.asPartner(a, async () => null);
    const [row] = await db.execute<{ role: string }>(sql`select current_user as role`);
    expect(row.role).toBe("postgres");
  });
});
