import { describe, expect, it } from "vitest";
import { isAdmin, leadOutcome, monthlyRecurringCents, sponsorshipState } from "./admin";

describe("chi è amministratore", () => {
  it("il ruolo admin basta", () => {
    expect(isAdmin({ role: "admin", email: "x@y.it", emailVerified: false }, [])).toBe(true);
  });

  it("l'email in elenco vale solo se confermata", () => {
    expect(isAdmin({ role: "client", email: "Tommaso@Geco.it", emailVerified: true }, ["tommaso@geco.it"])).toBe(true);
    expect(isAdmin({ role: "client", email: "tommaso@geco.it", emailVerified: false }, ["tommaso@geco.it"])).toBe(false);
    expect(isAdmin({ role: "partner", email: "mario@rossi.it", emailVerified: true }, ["tommaso@geco.it"])).toBe(false);
  });
});

describe("ricorrente mensile", () => {
  it("somma i mensili e un dodicesimo degli annuali", () => {
    const subs = [
      { period: "monthly" as const, monthlyPriceCents: 4900, yearlyPriceCents: 49000 },
      { period: "yearly" as const, monthlyPriceCents: 9900, yearlyPriceCents: 99000 },
    ];
    expect(monthlyRecurringCents(subs)).toBe(4900 + 8250);
    expect(monthlyRecurringCents([])).toBe(0);
  });
});

describe("esito di una richiesta nel gestionale", () => {
  const base = { verifiedAt: new Date(), deliveredAt: new Date(), charge: "quota", reportStatus: null };

  it("consegnata con i contatti", () => {
    expect(leadOutcome(base).key).toBe("delivered");
  });

  it("mai confermata con il codice", () => {
    expect(leadOutcome({ ...base, verifiedAt: null, deliveredAt: null, charge: "pending" }).key).toBe("unconfirmed");
  });

  it("piano gratuito al limite: arrivata senza contatti", () => {
    expect(leadOutcome({ ...base, charge: "locked" }).key).toBe("locked");
  });

  it("duplicato annullato", () => {
    expect(leadOutcome({ ...base, deliveredAt: null, charge: "duplicate" }).key).toBe("duplicate");
  });

  it("confermata ma l'azienda non era attiva", () => {
    expect(leadOutcome({ ...base, deliveredAt: null, charge: "pending" }).key).toBe("not_delivered");
  });

  it("segnalazione accolta: restituita", () => {
    expect(leadOutcome({ ...base, charge: "refunded", reportStatus: "accepted" }).key).toBe("refunded");
  });
});

describe("stato di una sponsorizzazione", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  const day = 86_400_000;

  it("programmata, attiva, in scadenza, finita", () => {
    expect(sponsorshipState({ startsAt: new Date(now.getTime() + day), endsAt: new Date(now.getTime() + 8 * day) }, now)).toBe("scheduled");
    expect(sponsorshipState({ startsAt: new Date(now.getTime() - day), endsAt: new Date(now.getTime() + 8 * day) }, now)).toBe("active");
    expect(sponsorshipState({ startsAt: new Date(now.getTime() - day), endsAt: new Date(now.getTime() + 2 * day) }, now)).toBe("ending");
    expect(sponsorshipState({ startsAt: new Date(now.getTime() - 9 * day), endsAt: new Date(now.getTime() - day) }, now)).toBe("ended");
  });
});
