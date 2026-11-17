import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Email "Com'è andata?" ai clienti, sul database dei test end-to-end (geco_e2e): parte una volta sola per richiesta,
 * dopo 3 giorni dalla consegna e non oltre 14. Serve il database di `npm run dev` avviato; senza, il test viene saltato.
 */

vi.mock("server-only", () => ({}));

const URL_E2E = "postgres://postgres:postgres@127.0.0.1:54329/geco_e2e";
const postgres = (await import("postgres")).default;
const owner = postgres(URL_E2E, { max: 1, onnotice: () => {}, connect_timeout: 2 });
const UP = await owner`select 1`.then(
  () => true,
  () => false,
);

const DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!UP)("email \"Com'è andata?\"", () => {
  let followUp: typeof import("./lead-follow-up");
  const now = new Date();
  const created: string[] = [];
  const sent: string[] = [];

  /** Una richiesta consegnata `daysAgo` giorni fa, copiata da una esistente. */
  async function deliveredLead(daysAgo: number, extra: Record<string, unknown> = {}) {
    const at = new Date(now.getTime() - daysAgo * DAY).toISOString();
    const [{ id }] = await owner<{ id: string }[]>`
      insert into leads
      select * from jsonb_populate_record(null::leads, (select to_jsonb(l) from leads l limit 1)
        || jsonb_build_object('id', gen_random_uuid(), 'delivered_at', ${at}::text, 'verified_at', ${at}::text,
             'charge', 'quota', 'report_status', null, 'follow_up_sent_at', null, 'client_contacted', null,
             'client_answered_at', null)
        || ${owner.json(extra as never)})
      returning id`;
    created.push(id);
    return id;
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_E2E;
    vi.doMock("@/lib/notify", () => ({
      sendEmail: async (_to: string, _subject: string, text: string) => {
        const id = text.match(/com-e-andata\/([0-9a-f-]{36})/)?.[1];
        if (id) sent.push(id);
      },
    }));
    followUp = await import("./lead-follow-up");
  });

  afterAll(async () => {
    if (created.length) await owner`delete from leads where id in ${owner(created)}`;
    await owner.end();
  });

  it("scrive solo alle richieste consegnate da 3 a 14 giorni fa, una volta sola", async () => {
    const due = await deliveredLead(4);
    const tooRecent = await deliveredLead(1);
    const tooOld = await deliveredLead(20);
    const answered = await deliveredLead(5, { client_contacted: true, client_answered_at: now.toISOString() });
    const rejected = await deliveredLead(5, { report_status: "accepted" });

    await followUp.sendFollowUps(now);
    expect(sent).toContain(due);
    for (const id of [tooRecent, tooOld, answered, rejected]) expect(sent).not.toContain(id);

    sent.length = 0;
    await followUp.sendFollowUps(now);
    expect(sent).not.toContain(due);
  });

  it("salva la risposta del cliente solo sulle richieste consegnate", async () => {
    const id = await deliveredLead(4);
    expect(await followUp.answerFollowUp(id, false)).toBe(true);
    const [row] = await owner<{ client_contacted: boolean; client_answered_at: Date | null }[]>`
      select client_contacted, client_answered_at from leads where id = ${id}`;
    expect(row.client_contacted).toBe(false);
    expect(row.client_answered_at).not.toBeNull();

    const notDelivered = await deliveredLead(4, { delivered_at: null });
    expect(await followUp.answerFollowUp(notDelivered, true)).toBe(false);
  });
});
