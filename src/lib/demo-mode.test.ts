import { afterEach, describe, expect, it, vi } from "vitest";
import { demoMode } from "./demo-mode";

describe("demoMode", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("è attiva in sviluppo", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(demoMode()).toBe(true);
  });

  it("in produzione è spenta di default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "1");
    vi.stubEnv("SITE_ACCESS", "");
    expect(demoMode()).toBe(false);
  });

  it("in produzione si accende solo con DEMO_MODE=1 e sito protetto da password", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_ACCESS", "tommaso:uno-due");
    vi.stubEnv("DEMO_MODE", "");
    expect(demoMode()).toBe(false);
    vi.stubEnv("DEMO_MODE", "1");
    expect(demoMode()).toBe(true);
  });
});
