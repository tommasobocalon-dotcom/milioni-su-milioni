import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * Controllo automatico WCAG 2.1 AA (axe-core) sulle pagine principali di ogni area.
 * Non sostituisce la prova con lettore di schermo e tastiera, ma ferma le regressioni misurabili:
 * contrasto, etichette, nomi dei bottoni e dei link, struttura dei titoli, attributi ARIA.
 */

async function expectAccessible(page: Page, path: string) {
  // Le entrate allo scroll partono da opacità ridotta: senza movimento axe misura i colori finali.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const report = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `   ${n.target.join(" ")}  ${n.html.slice(0, 160)}\n     ${n.failureSummary?.split("\n").slice(1).join(" ")}`).join("\n")}`);
  expect.soft(report, `${path}\n${report.join("\n")}`).toEqual([]);
}

async function login(page: Page, area: "azienda" | "admin", email: string) {
  await page.goto(area === "admin" ? "/admin/accedi" : "/accedi/azienda");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill("geco-demo-2026");
  await page.locator("form").getByRole("button", { name: area === "admin" ? "Entra nel gestionale" : "Accedi" }).click();
  await page.waitForURL((url) => !url.pathname.includes("accedi"));
}

const PUBLIC_PAGES = [
  "/",
  "/trova-professionista",
  "/trova-casa",
  "/cerca?q=rifare+il+bagno+a+Padova",
  "/idraulico/padova",
  "/agenzia-immobiliare/padova",
  "/professionisti/padova/idraulico/rossi-impianti",
  "/richiesta/rossi-impianti",
  "/ispirazione",
  "/come-funziona",
  "/come-ordiniamo-i-risultati",
  "/per-i-professionisti",
  "/chi-siamo",
  "/assistenza",
  "/privacy",
  "/termini",
  "/accedi",
  "/accedi/azienda",
  "/registrazione-partner",
  "/pagina-che-non-esiste",
];

// Le pagine di più passi vanno compilate da next dev al primo giro: serve più del minuto di default.
test.describe.configure({ timeout: 180_000 });

// Mobile-first: ogni pagina sia sul computer sia sul telefono (tabelle e caroselli larghi si scorrono solo lì).
const VIEWPORTS = { computer: { width: 1280, height: 800 }, telefono: { width: 390, height: 844 } };

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(device, () => {
    test.use({ viewport });

    for (const path of PUBLIC_PAGES) {
      test(`accessibile: ${path}`, async ({ page }) => {
        await expectAccessible(page, path);
      });
    }

    // La pagina di un lavoro (/ispirazione/[id]) non c'è: nel database dei test i lavori li crea solo ispirazione.spec.ts.
    test("accessibile: scheda di un'agenzia", async ({ page }) => {
      await page.goto("/trova-casa");
      const agency = await page.locator('a[href^="/agenzie/"]').first().getAttribute("href");
      await expectAccessible(page, agency!);
    });

    test("accessibile: area cliente", async ({ page }) => {
      await page.goto("/accedi");
      await page.getByRole("button", { name: "Crea account" }).click();
      await page.getByLabel(/^Nome e cognome/).fill("Anna Verdi");
      await page.getByRole("textbox", { name: /^Email/ }).fill(`a11y-${Date.now()}@example.com`);
      await page.getByLabel(/^Password/).fill("password di prova 1");
      await page.getByLabel(/^Accetto i termini/).check();
      await page.getByRole("button", { name: "Crea il tuo account" }).click();
      await expect(page).toHaveURL(/\/area-cliente$/);
      await expectAccessible(page, "/area-cliente");
    });

    test("accessibile: Area Partner", async ({ page }) => {
      await login(page, "azienda", "mario@rossiimpianti.it");
      for (const path of [
        "/area-partner",
        "/area-partner/lead",
        "/area-partner/profilo",
        "/area-partner/profilo/modifica",
        "/area-partner/lavori",
        "/area-partner/listino",
        "/area-partner/sponsorizzazioni",
        "/area-partner/abbonamento",
        "/area-partner/statistiche",
        "/area-partner/assistenza",
      ]) {
        await expectAccessible(page, path);
      }
      await page.goto("/area-partner/lead");
      const lead = await page.locator('a[href^="/area-partner/lead/"]').first().getAttribute("href");
      await expectAccessible(page, lead!);
    });

    test("accessibile: gestionale", async ({ page }) => {
      await expectAccessible(page, "/admin/accedi");
      await login(page, "admin", "admin@gecoitalia.it");
      for (const path of ["/admin", "/admin/assistenza", "/admin/partner", "/admin/richieste", "/admin/abbonamenti", "/admin/sponsorizzazioni", "/admin/segnalazioni", "/admin/registro", "/admin/zone", "/admin/categorie"]) {
        await expectAccessible(page, path);
      }
    });
  });
}
