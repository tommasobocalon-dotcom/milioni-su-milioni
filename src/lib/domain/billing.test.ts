import { describe, expect, it } from "vitest";
import { accountStatusFrom, grantsRenewalTokens, periodFromItems, subscriptionStatusFromStripe, tokenMonthsDue, tokenPurchaseFromCheckout } from "./billing";

describe("subscriptionStatusFromStripe", () => {
  it("attivo solo con pagamento in regola", () => {
    expect(subscriptionStatusFromStripe("active")).toBe("active");
    expect(subscriptionStatusFromStripe("trialing")).toBe("active");
  });

  it("sospende subito al pagamento fallito (nessuna tolleranza)", () => {
    expect(subscriptionStatusFromStripe("past_due")).toBe("suspended");
    expect(subscriptionStatusFromStripe("unpaid")).toBe("suspended");
    expect(subscriptionStatusFromStripe("paused")).toBe("suspended");
  });

  it("primo pagamento non ancora confermato (es. SEPA): in attivazione", () => {
    expect(subscriptionStatusFromStripe("incomplete")).toBe("activating");
  });

  it("disdetta o primo pagamento mai arrivato: cancellato", () => {
    expect(subscriptionStatusFromStripe("canceled")).toBe("cancelled");
    expect(subscriptionStatusFromStripe("incomplete_expired")).toBe("cancelled");
  });

  it("stato sconosciuto: sospeso, mai attivo per errore", () => {
    expect(subscriptionStatusFromStripe("nuovo_stato")).toBe("suspended");
  });
});

describe("accountStatusFrom", () => {
  it("basta un abbonamento attivo perché la scheda sia attiva", () => {
    expect(accountStatusFrom(["cancelled", "active"])).toBe("active");
  });

  it("un vecchio abbonamento disdetto non cancella quello nuovo in attivazione", () => {
    expect(accountStatusFrom(["cancelled", "activating"])).toBe("activating");
  });

  it("sospeso prevale su in attivazione e cancellato", () => {
    expect(accountStatusFrom(["activating", "suspended", "cancelled"])).toBe("suspended");
  });

  it("solo abbonamenti chiusi: cancellato; nessun abbonamento: in attivazione", () => {
    expect(accountStatusFrom(["cancelled"])).toBe("cancelled");
    expect(accountStatusFrom([])).toBe("activating");
  });
});

describe("periodFromItems", () => {
  it("converte i secondi Unix delle voci in date", () => {
    const p = periodFromItems([{ current_period_start: 1_790_000_000, current_period_end: 1_792_592_000 }]);
    expect(p.start).toEqual(new Date(1_790_000_000_000));
    expect(p.end).toEqual(new Date(1_792_592_000_000));
  });

  it("senza voci è un errore (abbonamento Stripe non valido)", () => {
    expect(() => periodFromItems([])).toThrow();
  });
});

describe("tokenPurchaseFromCheckout", () => {
  const paid = { mode: "payment", payment_status: "paid", metadata: { kind: "tokens", partnerId: "p1", packageCode: "pro" } };

  it("pacchetto pagato: partner e token da accreditare", () => {
    expect(tokenPurchaseFromCheckout(paid)).toEqual({ partnerId: "p1", tokens: 300, name: "Pro" });
  });

  it("SEPA ancora in elaborazione: niente accredito", () => {
    expect(tokenPurchaseFromCheckout({ ...paid, payment_status: "unpaid" })).toBeNull();
  });

  it("checkout di abbonamento o metadati estranei: ignorato", () => {
    expect(tokenPurchaseFromCheckout({ ...paid, mode: "subscription" })).toBeNull();
    expect(tokenPurchaseFromCheckout({ ...paid, metadata: { kind: "tokens", partnerId: "p1", packageCode: "gigante" } })).toBeNull();
    expect(tokenPurchaseFromCheckout({ ...paid, metadata: {} })).toBeNull();
    expect(tokenPurchaseFromCheckout({ ...paid, metadata: null })).toBeNull();
  });
});

describe("grantsRenewalTokens", () => {
  it("token omaggio a ogni periodo pagato, primo compreso", () => {
    expect(grantsRenewalTokens("subscription_create")).toBe(true);
    expect(grantsRenewalTokens("subscription_cycle")).toBe(true);
  });

  it("non per conguagli di cambio piano o fatture manuali", () => {
    expect(grantsRenewalTokens("subscription_update")).toBe(false);
    expect(grantsRenewalTokens("manual")).toBe(false);
    expect(grantsRenewalTokens(null)).toBe(false);
  });
});

describe("tokenMonthsDue", () => {
  const start = new Date("2026-01-31T10:00:00Z");

  it("una quota di token appena inizia il periodo", () => {
    expect(tokenMonthsDue(start, start)).toBe(1);
  });

  it("una in più a ogni mese compiuto, anche nei mesi corti", () => {
    expect(tokenMonthsDue(start, new Date("2026-02-27T10:00:00Z"))).toBe(1);
    expect(tokenMonthsDue(start, new Date("2026-02-28T10:00:00Z"))).toBe(2);
    expect(tokenMonthsDue(start, new Date("2026-03-31T10:00:00Z"))).toBe(3);
  });

  it("mai più di 12 in un anno", () => {
    expect(tokenMonthsDue(start, new Date("2027-06-01T10:00:00Z"))).toBe(12);
  });
});
