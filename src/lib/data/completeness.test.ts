import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Completezza della scheda calcolata dai dati veri dell'azienda (prima era una colonna scritta solo dal seed, quindi
 * sempre 0% per le aziende iscritte). Serve il database di `npm run dev` avviato; senza, il test viene saltato.
 */

vi.mock("server-only", () => ({}));

const URL_E2E = "postgres://postgres:postgres@127.0.0.1:54329/geco_e2e";
const postgres = (await import("postgres")).default;
const owner = postgres(URL_E2E, { max: 1, onnotice: () => {}, connect_timeout: 2 });
const UP = await owner`select 1`.then(
  () => true,
  () => false,
);

describe.skipIf(!UP)("profileCompleteness", () => {
  let read: () => Promise<number>;
  let partnerId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_E2E;
    const [{ db }, { profileCompleteness }, { partners }, { eq }] = await Promise.all([
      import("@/lib/db/client"),
      import("./completeness"),
      import("@/lib/db/schema"),
      import("drizzle-orm"),
    ]);
    [{ id: partnerId }] = await owner<{ id: string }[]>`
      insert into partners (type, category_id, business_name, display_name, slug, vat_number, municipality_id, lat, lng, tagline, description)
      select type, category_id, 'Test completezza', 'Test completezza', ${`test-completezza-${Date.now()}`}, '00000000000', municipality_id, lat, lng, 'Prova', ''
      from partners limit 1
      returning id`;
    read = async () => (await db.select({ c: profileCompleteness }).from(partners).where(eq(partners.id, partnerId)))[0].c;
  });

  afterAll(async () => {
    await owner`delete from partners where slug like 'test-completezza-%'`;
    await owner.end();
  });

  it("vale 0 per una scheda appena iscritta, senza niente oltre ai dati obbligatori", async () => {
    expect(await read()).toBe(0);
  });

  it("sale con logo, descrizione, specializzazioni, orari e anno di fondazione", async () => {
    await owner`
      update partners set logo_url = '/uploads/logo.png', description = ${"x".repeat(80)}, specialties = '{caldaie}',
        opening_hours = '[{"label":"Lun–Ven","value":"8–18"}]', founded_year = 2010
      where id = ${partnerId}`;
    expect(await read()).toBe(55);
  });

  it("arriva a 100 con almeno un prezzo nel listino e un lavoro pubblicato", async () => {
    await owner`
      insert into partner_services (partner_id, service_id, unit)
      select ${partnerId}, id, 'flat' from services limit 1`;
    await owner`insert into portfolio_items (partner_id, kind, title) values (${partnerId}, 'work', 'Prova')`;
    expect(await read()).toBe(100);
  });
});
