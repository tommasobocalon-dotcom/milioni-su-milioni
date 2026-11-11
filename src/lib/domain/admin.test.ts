import { describe, expect, it } from "vitest";
import { isAdmin, monthlyRecurringCents } from "./admin";

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
