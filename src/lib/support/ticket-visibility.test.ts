import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Ticket dell'assistenza nelle aree private (AUDIT-SICUREZZA.md §11, punto 4): dal modulo pubblico o per email chiunque
 * può scrivere con l'email di un altro, quindi Area Partner e Area cliente mostrano solo i ticket aperti da dentro
 * l'account. Database dei test end-to-end (geco_e2e): serve `npm run dev` avviato, altrimenti il test viene saltato.
 */

vi.mock("server-only", () => ({}));

const URL_E2E = "postgres://postgres:postgres@127.0.0.1:54329/geco_e2e";
const postgres = (await import("postgres")).default;
const owner = postgres(URL_E2E, { max: 1, onnotice: () => {}, connect_timeout: 2 });
const UP = await owner`select 1`.then(
  () => true,
  () => false,
);

describe.skipIf(!UP)("ticket a nome di altri nelle aree private", () => {
  let tenant: typeof import("@/lib/db/tenant");
  let schema: typeof import("@/lib/db/schema");
  let support: typeof import("./service");
  let partnerId: string;
  let ownerUser: { id: string; email: string; name: string };
  const tickets: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_E2E;
    process.env.EMAIL_PROVIDER = "console";
    vi.spyOn(console, "log").mockImplementation(() => {});
    tenant = await import("@/lib/db/tenant");
    schema = await import("@/lib/db/schema");
    support = await import("./service");
    // Il titolare di un'azienda di esempio.
    [ownerUser] = await owner<{ id: string; email: string; name: string }[]>`
      select u.id, u.email, u.name from partner_members m join users u on u.id = m.user_id where m.role = 'owner' limit 1`;
    [{ partner_id: partnerId }] = await owner<{ partner_id: string }[]>`select partner_id from partner_members where user_id = ${ownerUser.id} limit 1`;
  });

  afterAll(async () => {
    if (tickets.length) await owner`delete from support_tickets where id in ${owner(tickets)}`;
    await owner.end();
  });

  async function open(sessionUserId: string | null, subject: string) {
    const t = await support.openTicket({
      channel: "web",
      topic: "other",
      subject,
      body: "Testo scritto da chi ha compilato il modulo",
      requesterName: "Team GecoItalia",
      requesterEmail: ownerUser.email,
      sessionUserId,
    });
    tickets.push(t.id);
    return t;
  }

  it("un ticket aperto da fuori con l'email dell'azienda non compare nella sua Area Partner né nell'area cliente", async () => {
    const t = await open(null, `Da fuori ${Date.now()}`);
    const partnerSees = await tenant.asPartner(partnerId, (tx) => tx.select({ id: schema.supportTickets.id }).from(schema.supportTickets));
    expect(partnerSees.map((r) => r.id)).not.toContain(t.id);
    const clientSees = await tenant.asClient(ownerUser.id, (tx) => tx.select({ id: schema.supportTickets.id }).from(schema.supportTickets));
    expect(clientSees.map((r) => r.id)).not.toContain(t.id);
    const messages = await tenant.asPartner(partnerId, (tx) => tx.select({ ticketId: schema.supportMessages.ticketId }).from(schema.supportMessages));
    expect(messages.map((m) => m.ticketId)).not.toContain(t.id);
    // E l'azienda non può rispondere a un ticket che non vede.
    expect(await support.replyFromPartner(partnerId, t.number, ownerUser, "risposta")).toBe(false);
  });

  it("un ticket aperto da dentro l'account compare in Area Partner e nell'area cliente", async () => {
    const t = await open(ownerUser.id, `Da dentro ${Date.now()}`);
    const partnerSees = await tenant.asPartner(partnerId, (tx) => tx.select({ id: schema.supportTickets.id }).from(schema.supportTickets));
    expect(partnerSees.map((r) => r.id)).toContain(t.id);
    const clientSees = await tenant.asClient(ownerUser.id, (tx) => tx.select({ id: schema.supportTickets.id }).from(schema.supportTickets));
    expect(clientSees.map((r) => r.id)).toContain(t.id);
    expect(await support.replyFromPartner(partnerId, t.number, ownerUser, "risposta")).toBe(true);
  });
});
