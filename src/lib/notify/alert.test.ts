import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** Allarmi al team: a chi arrivano e niente raffiche dello stesso allarme (provider email "console"). */
describe("alertTeam", () => {
  let log: ReturnType<typeof vi.spyOn>;
  const sentTo = () => (log.mock.calls as unknown[][]).map((c) => String(c[0])).filter((s) => s.includes("[email →")).map((s) => s.match(/\[email → ([^\]\s]+)/)?.[1]);

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("EMAIL_PROVIDER", "console");
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("scrive a ALERT_EMAILS, altrimenti agli amministratori, altrimenti a info@", async () => {
    vi.stubEnv("ALERT_EMAILS", "a@x.it, b@x.it");
    vi.stubEnv("ADMIN_EMAILS", "admin@x.it");
    await (await import("./index")).alertTeam("Uno", "dettagli");
    expect(sentTo()).toEqual(["a@x.it", "b@x.it"]);

    log.mockClear();
    vi.stubEnv("ALERT_EMAILS", "");
    await (await import("./index")).alertTeam("Due", "dettagli");
    expect(sentTo()).toEqual(["admin@x.it"]);

    log.mockClear();
    vi.stubEnv("ADMIN_EMAILS", "");
    await (await import("./index")).alertTeam("Tre", "dettagli");
    expect(sentTo()).toEqual(["info@gecoitalia.it"]);
  });

  it("lo stesso allarme parte al massimo una volta ogni 10 minuti", async () => {
    vi.useFakeTimers();
    vi.stubEnv("ALERT_EMAILS", "a@x.it");
    const { alertTeam } = await import("./index");
    await alertTeam("Webhook", "primo");
    await alertTeam("Webhook", "secondo");
    await alertTeam("Altro", "diverso");
    expect(sentTo()).toHaveLength(2);
    vi.advanceTimersByTime(10 * 60_000);
    await alertTeam("Webhook", "terzo");
    expect(sentTo()).toHaveLength(3);
  });

  it("non lancia errori se l'invio fallisce", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "sconosciuto");
    await expect((await import("./index")).alertTeam("Giù", "dettagli")).resolves.toBeUndefined();
  });
});
