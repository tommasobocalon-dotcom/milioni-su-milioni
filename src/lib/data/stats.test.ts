import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Visite e aperture del modulo mandate dal browser (/api/evento): una sola per visitatore, azienda e giorno, così
 * ricaricare la pagina non gonfia le statistiche. Serve il database di `npm run dev` avviato; senza, il test viene saltato.
 */

vi.mock("server-only", () => ({}));

const URL_E2E = "postgres://postgres:postgres@127.0.0.1:54329/geco_e2e";
const postgres = (await import("postgres")).default;
const owner = postgres(URL_E2E, { max: 1, onnotice: () => {}, connect_timeout: 2 });
const UP = await owner`select 1`.then(
  () => true,
  () => false,
);

describe.skipIf(!UP)("recordBrowserEvent", () => {
  let stats: typeof import("./stats");
  let partnerId: string;
  const visitor = `test-${Date.now()}`;
  const count = async (type: string, v = visitor) =>
    (await owner<{ n: number }[]>`select count(*)::int as n from profile_events where partner_id = ${partnerId} and type = ${type} and visitor = ${v}`)[0].n;

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_E2E;
    stats = await import("./stats");
    [{ id: partnerId }] = await owner<{ id: string }[]>`select id from partners limit 1`;
  });

  afterAll(async () => {
    await owner`delete from profile_events where visitor like 'test-%'`;
    await owner.end();
  });

  it("conta una visita sola per visitatore e azienda, anche ricaricando", async () => {
    for (let i = 0; i < 5; i++) await stats.recordBrowserEvent(partnerId, "view", visitor);
    expect(await count("view")).toBe(1);
  });

  it("conta separatamente l'apertura del modulo e gli altri visitatori", async () => {
    await stats.recordBrowserEvent(partnerId, "contact_click", visitor);
    await stats.recordBrowserEvent(partnerId, "view", `${visitor}-altro`);
    expect(await count("contact_click")).toBe(1);
    expect(await count("view", `${visitor}-altro`)).toBe(1);
  });
});
