import { describe, expect, it } from "vitest";
import { accountStatusFrom, listingStatus, periodFromItems, planFromLookupKey, planLookupKey, subscriptionStatusFromStripe, homeSponsorFromCheckout, areaExtensionFromCheckout, searchBoostFromCheckout } from "./billing";

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

describe("planLookupKey / planFromLookupKey", () => {
  it("il prezzo Stripe porta piano e periodo nella lookup_key", () => {
    expect(planLookupKey("normal", "yearly")).toBe("geco_normal_yearly");
    expect(planFromLookupKey("geco_premium_monthly")).toEqual({ code: "premium", period: "monthly" });
  });

  it("chiavi estranee o assenti: nessun piano", () => {
    expect(planFromLookupKey("altro_prezzo")).toBeNull();
    expect(planFromLookupKey("geco_normal_weekly")).toBeNull();
    expect(planFromLookupKey(null)).toBeNull();
  });
});

describe("homeSponsorFromCheckout", () => {
  const paid = { mode: "payment", payment_status: "paid", metadata: { kind: "home_sponsor", partnerId: "p1", packageCode: "home-30" } };

  it("pacchetto pagato: partner e giorni di logo in Home", () => {
    expect(homeSponsorFromCheckout(paid)).toEqual({ partnerId: "p1", days: 30 });
  });

  it("SEPA ancora in elaborazione o pacchetto sconosciuto: niente", () => {
    expect(homeSponsorFromCheckout({ ...paid, payment_status: "unpaid" })).toBeNull();
    expect(homeSponsorFromCheckout({ ...paid, metadata: { ...paid.metadata, packageCode: "home-365" } })).toBeNull();
  });

  it("acquisto di token o abbonamento: non è una sponsorizzazione", () => {
    expect(homeSponsorFromCheckout({ ...paid, metadata: { kind: "tokens", partnerId: "p1", packageCode: "pro" } })).toBeNull();
    expect(homeSponsorFromCheckout({ ...paid, mode: "subscription" })).toBeNull();
  });
});

describe("areaExtensionFromCheckout", () => {
  const paid = { mode: "payment", payment_status: "paid", metadata: { kind: "area_extension", partnerId: "p1", provinceIds: "28,26" } };

  it("estensione pagata: partner e province da aggiungere", () => {
    expect(areaExtensionFromCheckout(paid)).toEqual({ partnerId: "p1", provinceIds: [28, 26] });
  });

  it("non pagata, senza province o di un altro tipo: niente", () => {
    expect(areaExtensionFromCheckout({ ...paid, payment_status: "unpaid" })).toBeNull();
    expect(areaExtensionFromCheckout({ ...paid, metadata: { ...paid.metadata, provinceIds: "" } })).toBeNull();
    expect(areaExtensionFromCheckout({ ...paid, metadata: { kind: "home_sponsor", partnerId: "p1", packageCode: "home-7" } })).toBeNull();
  });
});

describe("searchBoostFromCheckout", () => {
  const paid = { mode: "payment", payment_status: "paid", metadata: { kind: "search_boost", partnerId: "p1", packageCode: "search-48" } };

  it("boost pagato: partner e ore di sponsorizzazione nella ricerca", () => {
    expect(searchBoostFromCheckout(paid)).toEqual({ partnerId: "p1", hours: 48 });
  });

  it("non pagato, pacchetto sconosciuto o logo in Home: niente", () => {
    expect(searchBoostFromCheckout({ ...paid, payment_status: "unpaid" })).toBeNull();
    expect(searchBoostFromCheckout({ ...paid, metadata: { ...paid.metadata, packageCode: "search-72" } })).toBeNull();
    expect(searchBoostFromCheckout({ ...paid, metadata: { kind: "home_sponsor", partnerId: "p1", packageCode: "home-7" } })).toBeNull();
  });
});

describe("listingStatus", () => {
  it("la scheda va online solo con il piano attivo e i dati verificati dal team", () => {
    expect(listingStatus("active", "verified")).toBe("active");
  });

  it("con il piano attivo ma senza verifica (o con la verifica respinta) resta nascosta, in attivazione", () => {
    expect(listingStatus("active", "pending")).toBe("activating");
    expect(listingStatus("active", "rejected")).toBe("activating");
  });

  it("senza piano attivo vale lo stato del piano, verificata o no", () => {
    expect(listingStatus("suspended", "verified")).toBe("suspended");
    expect(listingStatus("cancelled", "pending")).toBe("cancelled");
    expect(listingStatus("activating", "verified")).toBe("activating");
  });
});
