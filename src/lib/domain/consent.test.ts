import { describe, expect, it } from "vitest";
import { conversionCalls, parseConsent, serializeConsent, trackingEnabled } from "./consent";

const config = { googleAdsId: "AW-123", googleLabels: { lead: "abcLead", signup: "abcSignup", purchase: "abcPurchase" }, metaPixelId: "999" };

describe("cookie del consenso", () => {
  it("rilegge la scelta salvata", () => {
    expect(parseConsent(serializeConsent(true))).toEqual({ marketing: true });
    expect(parseConsent(serializeConsent(false))).toEqual({ marketing: false });
  });

  it("senza cookie, con un valore strano o di una versione vecchia la scelta va richiesta di nuovo", () => {
    expect(parseConsent(undefined)).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent("si")).toBeNull();
    expect(parseConsent("v0:1")).toBeNull();
  });
});

describe("trackingEnabled", () => {
  it("serve almeno Google Ads o il pixel di Meta: senza, niente banner", () => {
    expect(trackingEnabled(config)).toBe(true);
    expect(trackingEnabled({ googleAdsId: "", googleLabels: {}, metaPixelId: "999" })).toBe(true);
    expect(trackingEnabled({ googleAdsId: "", googleLabels: {}, metaPixelId: "" })).toBe(false);
  });
});

describe("conversionCalls", () => {
  it("una richiesta inviata è una conversione Google Ads e un Lead di Meta", () => {
    expect(conversionCalls("lead", config)).toEqual([
      { to: "google", args: ["event", "conversion", { send_to: "AW-123/abcLead" }] },
      { to: "meta", args: ["track", "Lead"] },
    ]);
  });

  it("iscrizione e pagamento delle aziende hanno i loro eventi", () => {
    expect(conversionCalls("signup", config).map((c) => c.args)).toEqual([
      ["event", "conversion", { send_to: "AW-123/abcSignup" }],
      ["track", "CompleteRegistration"],
    ]);
    expect(conversionCalls("purchase", config).map((c) => c.args)).toEqual([
      ["event", "conversion", { send_to: "AW-123/abcPurchase" }],
      ["track", "Purchase", { currency: "EUR", value: 0 }],
    ]);
  });

  it("salta Google senza l'etichetta della conversione e Meta senza pixel", () => {
    expect(conversionCalls("lead", { googleAdsId: "AW-123", googleLabels: {}, metaPixelId: "" })).toEqual([]);
  });
});
