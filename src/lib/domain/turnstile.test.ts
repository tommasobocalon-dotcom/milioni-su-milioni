import { describe, expect, it, vi } from "vitest";
import { checkTurnstile } from "./turnstile";

const reply = (body: object, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as Response);

describe("verifica Cloudflare Turnstile", () => {
  it("senza chiave segreta non controlla (sviluppo e test)", async () => {
    const fetch = reply({ success: false });
    expect(await checkTurnstile("", { secret: undefined, ip: "1.2.3.4", fetch })).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("con la chiave, un token mancante non passa e non chiama Cloudflare", async () => {
    const fetch = reply({ success: true });
    expect(await checkTurnstile("", { secret: "s", ip: "1.2.3.4", fetch })).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("manda segreto, token e IP a siteverify e rispetta la risposta", async () => {
    const ok = reply({ success: true });
    expect(await checkTurnstile("tok", { secret: "s", ip: "1.2.3.4", fetch: ok })).toBe(true);
    const [url, init] = ok.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = init.body as URLSearchParams;
    expect(body.get("secret")).toBe("s");
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("1.2.3.4");

    expect(await checkTurnstile("tok", { secret: "s", ip: "1.2.3.4", fetch: reply({ success: false }) })).toBe(false);
  });

  it("se Cloudflare non risponde, la richiesta non passa", async () => {
    const down = vi.fn(async () => {
      throw new Error("rete");
    });
    expect(await checkTurnstile("tok", { secret: "s", ip: "1.2.3.4", fetch: down })).toBe(false);
    expect(await checkTurnstile("tok", { secret: "s", ip: "1.2.3.4", fetch: reply({}, false) })).toBe(false);
  });
});
