import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import postgres from "postgres";
import { E2E_DATABASE_URL } from "../playwright.config";

/**
 * Commenti sotto i lavori di Ispirazione (13/11/2026): li scrive chi ha fatto l'accesso e confermato l'email, per
 * chiedere e dare consigli (non sono recensioni). Niente link, un filtro di parole manda in attesa di approvazione,
 * c'è un tetto di frequenza. Ognuno elimina i propri e segnala quelli degli altri; l'azienda approva, nasconde,
 * limita e blocca dalla pagina del lavoro e da Area Partner → Commenti.
 */

const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
const TITLE = "Scala in legno a Dolo";
const ANNA = "anna.commenti@example.com";
const LUCA = "luca.nonconfermato@example.com";
const PASSWORD = "geco-demo-2026";
let work: string;
let rossi: string;
let mario: string;
let anna: string;
let extras: string[] = [];

test.beforeAll(async () => {
  [{ id: rossi }] = await sql<{ id: string }[]>`select id from partners where slug = 'rossi-impianti'`;
  [{ id: mario }] = await sql<{ id: string }[]>`select id from users where email = 'mario@rossiimpianti.it'`;
  await sql`update partners set account_status = 'active', hidden_words = ${sql.array(["prezzi folli"])} where id = ${rossi}`;
  await sql`insert into partner_members (partner_id, user_id, role) values (${rossi}, ${mario}, 'owner') on conflict do nothing`;
  // Due clienti con la stessa password di Mario: Anna con l'email confermata, Luca no. Più tre account per le segnalazioni.
  const account = (email: string, name: string, verified: boolean) => sql<{ id: string }[]>`
    insert into users (email, name, role, password_hash, email_verified_at)
    select ${email}, ${name}, 'client', password_hash, ${verified ? sql`now()` : null} from users where id = ${mario}
    on conflict (email) do update set name = excluded.name returning id`;
  [{ id: anna }] = await account(ANNA, "Anna Verdi", true);
  await account(LUCA, "Luca Neri", false);
  extras = [];
  for (const [i, name] of ["Sara Bianchi", "Piero Gallo", "Nadia Fabbri"].entries()) extras.push((await account(`segnala${i + 1}.commenti@example.com`, name, true))[0].id);
  [{ id: work }] = await sql<{ id: string }[]>`
    insert into portfolio_items (partner_id, kind, title, description, image_url, photos, created_at)
    values (${rossi}, 'work', ${TITLE}, 'Scala a giorno in rovere con corrimano in ferro.',
            '/foto/categorie/ristrutturazioni.jpg', ${sql.array(["/foto/categorie/ristrutturazioni.jpg", "/foto/categorie/idraulici.webp"])}, now() + interval '3 hours')
    returning id`;
});

test.beforeEach(async () => {
  await sql`delete from portfolio_comments where portfolio_item_id = ${work}`;
  await sql`delete from partner_blocks where partner_id = ${rossi}`;
  await sql`delete from partner_follows where partner_id = ${rossi}`;
});

test.afterAll(async () => {
  await sql`delete from portfolio_items where id = ${work}`;
  await sql`delete from partner_blocks where partner_id = ${rossi}`;
  await sql`update partners set hidden_words = '{}' where id = ${rossi}`;
  await sql`delete from users where email in ${sql([ANNA, LUCA, "segnala1.commenti@example.com", "segnala2.commenti@example.com", "segnala3.commenti@example.com"])}`;
  await sql.end();
});

const workPath = () => `/ispirazione/${work}`;
const comment = (page: Page, text: string | RegExp) => page.getByRole("region", { name: "Commenti" }).getByRole("listitem").filter({ hasText: text });
const addComment = (body: string, user = anna, status = "visible") =>
  sql<{ id: string }[]>`insert into portfolio_comments (portfolio_item_id, user_id, body, status) values (${work}, ${user}, ${body}, ${status}::comment_status) returning id`;
const statusOf = async (text: string) => (await sql<{ status: string }[]>`select status from portfolio_comments where portfolio_item_id = ${work} and body = ${text}`)[0]?.status;

/** I browser delle persone del test: si chiudono alla fine, così non restano pagine aperte sul server dei test. */
const opened: BrowserContext[] = [];
test.afterEach(async () => {
  await Promise.all(opened.splice(0).map((c) => c.close()));
});

/** Una persona con il suo browser: entra dall'accesso clienti (o aziende) e arriva alla pagina del lavoro. */
async function enter(browser: Browser, email: string, audience: "client" | "business" = "client") {
  const context = await browser.newContext({ locale: "it-IT" });
  opened.push(context);
  const page = await context.newPage();
  await page.goto(audience === "business" ? "/accedi/azienda" : `/accedi?next=${encodeURIComponent(workPath())}`);
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.locator("form").getByRole("button", { name: "Accedi" }).click();
  if (audience === "business") {
    await expect(page).toHaveURL(/\/area-partner$/);
    await page.goto(workPath());
  } else await expect(page).toHaveURL(new RegExp(`${workPath()}$`));
  return page;
}

async function write(page: Page, text: string) {
  await page.getByLabel("Scrivi un commento").fill(text);
  await page.getByRole("button", { name: "Pubblica" }).click();
}

const menu = (page: Page, author: string) => page.getByLabel(`Azioni sul commento di ${author}`);

test("senza accesso si leggono i commenti ma per scrivere bisogna entrare", async ({ page }) => {
  await addComment("Che essenza avete usato per i gradini?");
  await page.goto(workPath());
  await expect(page.getByRole("region", { name: "Commenti" }).getByText("1 commento.")).toBeVisible();
  await expect(comment(page, "Che essenza avete usato")).toContainText("Anna V.");
  await expect(page.getByLabel("Scrivi un commento")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Accedi per commentare" })).toHaveAttribute("href", `/accedi?next=${encodeURIComponent(`${workPath()}#commenti`)}`);

  // Nel feed il conto porta ai commenti del lavoro.
  await page.goto("/ispirazione");
  const post = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: TITLE }) });
  await expect(post.getByRole("link", { name: "1 commento" })).toHaveAttribute("href", `${workPath()}#commenti`);
});

test("chi ha confermato l'email commenta, senza link, ed elimina il proprio commento", async ({ browser }) => {
  const page = await enter(browser, ANNA);
  await write(page, "Bella scala! Quanto ci avete messo a montarla?");
  await expect(page.getByText("Commento pubblicato.")).toBeVisible();
  await expect(comment(page, "Bella scala!")).toContainText("Anna V.");
  await expect(page.getByLabel("Scrivi un commento")).toHaveValue("");

  await write(page, "Guardate anche www.scale-economiche.com");
  await expect(page.locator("form").getByRole("alert")).toHaveText("Nei commenti non si possono mettere link");
  expect((await sql`select 1 from portfolio_comments where portfolio_item_id = ${work}`).length).toBe(1);

  // Chi non ha confermato l'email trova la spiegazione al posto del modulo.
  const luca = await enter(browser, LUCA);
  await expect(luca.getByText(/Per commentare conferma prima la tua email/)).toBeVisible();
  await expect(luca.getByLabel("Scrivi un commento")).toHaveCount(0);
  await expect(comment(luca, "Bella scala!")).toBeVisible();

  await menu(page, "Anna V.").click();
  await page.getByRole("button", { name: "Elimina il mio commento" }).click();
  await expect(comment(page, "Bella scala!")).toHaveCount(0);
  expect((await sql`select 1 from portfolio_comments where portfolio_item_id = ${work}`).length).toBe(0);
});

test("una parola del filtro manda il commento in attesa: l'azienda lo approva da Area Partner", async ({ browser, page: visitor }) => {
  const annaPage = await enter(browser, ANNA);
  await write(annaPage, "Per me siete dei LADRI");
  await expect(annaPage.getByText("Commento inviato: si vedrà dopo l'approvazione dell'azienda.")).toBeVisible();
  await expect(comment(annaPage, "siete dei LADRI")).toContainText("In attesa di approvazione dell'azienda");
  expect(await statusOf("Per me siete dei LADRI")).toBe("pending");
  // Anche l'elenco personale dell'azienda ("prezzi folli") manda in attesa.
  await write(annaPage, "Bella, ma con prezzi   folli");
  await expect.poll(() => statusOf("Bella, ma con prezzi folli")).toBe("pending");

  await visitor.goto(workPath());
  await expect(visitor.getByRole("region", { name: "Commenti" }).getByText("Nessun commento.")).toBeVisible();
  await expect(comment(visitor, "LADRI")).toHaveCount(0);

  const marioPage = await enter(browser, "mario@rossiimpianti.it", "business");
  await marioPage.goto("/area-partner");
  await marioPage.getByRole("link", { name: "Commenti", exact: true }).first().click();
  await expect(marioPage.getByRole("heading", { level: 1, name: "Commenti" })).toBeVisible();
  const queue = marioPage.getByRole("region", { name: "Da approvare" });
  const row = queue.getByRole("listitem").filter({ hasText: "prezzi folli" });
  await expect(row).toContainText("Anna V.");
  await row.getByRole("button", { name: "Approva" }).click();
  await expect(queue.getByRole("listitem").filter({ hasText: "prezzi folli" })).toHaveCount(0);
  await queue.getByRole("listitem").filter({ hasText: "LADRI" }).getByRole("button", { name: "Nascondi" }).click();
  await expect(marioPage.getByRole("region", { name: "Nascosti da te" }).getByText("Per me siete dei LADRI")).toBeVisible();

  await visitor.reload();
  await expect(comment(visitor, "prezzi folli")).toBeVisible();
  await expect(comment(visitor, "LADRI")).toHaveCount(0);
  await annaPage.reload();
  await expect(comment(annaPage, "LADRI")).toContainText("Nascosto dall'azienda");
});

test("l'azienda risponde, nasconde e blocca dalla pagina del lavoro; chi è bloccato non commenta e non segue", async ({ browser, page: visitor }) => {
  await addComment("Lavoro fatto male secondo me");
  await sql`insert into partner_follows (partner_id, user_id) values (${rossi}, ${anna})`;
  const marioPage = await enter(browser, "mario@rossiimpianti.it", "business");

  await write(marioPage, "Grazie del parere: i gradini sono in rovere massello.");
  await expect(comment(marioPage, "rovere massello")).toContainText("Azienda");

  await menu(marioPage, "Anna V.").click();
  await marioPage.getByRole("button", { name: "Nascondi" }).click();
  await expect(comment(marioPage, "Lavoro fatto male")).toContainText("Nascosto dall'azienda");
  await visitor.goto(workPath());
  await expect(comment(visitor, "Lavoro fatto male")).toHaveCount(0);
  await expect(comment(visitor, "rovere massello")).toBeVisible();

  await menu(marioPage, "Anna V.").click();
  await marioPage.getByRole("button", { name: "Blocca questa persona" }).click();
  await expect(comment(marioPage, "Lavoro fatto male")).toContainText("Persona bloccata");
  expect((await sql`select 1 from partner_follows where partner_id = ${rossi} and user_id = ${anna}`).length).toBe(0);

  const annaPage = await enter(browser, ANNA);
  await write(annaPage, "Ci riprovo");
  await expect(annaPage.locator("form").getByRole("alert")).toHaveText("Non puoi commentare i lavori di questa azienda.");
  await annaPage.getByRole("button", { name: "Segui Rossi Impianti" }).click();
  await expect(annaPage.getByText("Non puoi seguire questa azienda.")).toBeVisible();

  // Dall'Area Partner l'azienda la sblocca e lei torna a commentare.
  await marioPage.goto("/area-partner/commenti");
  const people = marioPage.getByRole("region", { name: "Persone bloccate o limitate" });
  await expect(people.getByRole("listitem")).toContainText("Anna V.");
  await people.getByRole("button", { name: "Sblocca" }).click();
  await expect(people.getByText("Non hai bloccato né limitato nessuno.")).toBeVisible();
  await write(annaPage, "Ci riprovo");
  await expect(annaPage.getByText("Commento pubblicato.")).toBeVisible();
});

test("chi è limitato scrive ma si vede solo dopo l'approvazione; solo chi gestisce l'azienda modera", async ({ browser }) => {
  const [{ id }] = await addComment("Primo commento di Anna");
  const marioPage = await enter(browser, "mario@rossiimpianti.it", "business");
  await menu(marioPage, "Anna V.").click();
  await marioPage.getByRole("button", { name: "Limita questa persona" }).click();
  await expect(comment(marioPage, "Primo commento di Anna")).toContainText("Persona limitata");

  const annaPage = await enter(browser, ANNA);
  await write(annaPage, "Secondo commento di Anna");
  await expect(annaPage.getByText("Commento inviato: si vedrà dopo l'approvazione dell'azienda.")).toBeVisible();
  expect(await statusOf("Secondo commento di Anna")).toBe("pending");

  // Anna non ha il menu di moderazione sui commenti degli altri: per lei c'è solo "Segnala".
  await addComment("Commento di un altro", extras[0]);
  await annaPage.reload();
  await menu(annaPage, "Sara B.").click();
  await expect(annaPage.getByRole("button", { name: "Nascondi" })).toHaveCount(0);
  await expect(annaPage.getByRole("button", { name: "Blocca questa persona" })).toHaveCount(0);
  expect(await statusOf("Primo commento di Anna")).toBe("visible");
  expect(id).toBeTruthy();
});

test("segnalare è anonimo, una volta per persona; alla terza segnalazione il commento va in attesa", async ({ browser }) => {
  const [{ id }] = await addComment("Comprate da me, costo meno", extras[0]);
  const annaPage = await enter(browser, ANNA);
  await menu(annaPage, "Sara B.").click();
  await annaPage.getByText("Segnala", { exact: true }).click();
  await annaPage.getByLabel("Spam o pubblicità").check();
  await annaPage.getByLabel(/Vuoi aggiungere qualcosa/).fill("Pubblicità di un concorrente");
  await annaPage.getByRole("button", { name: "Invia segnalazione" }).click();
  await expect(annaPage.getByText(/Segnalazione inviata\. Chi ha scritto il commento non saprà/)).toBeVisible();
  const [report] = await sql<{ reason: string; note: string; status: string }[]>`select reason, note, status from comment_reports where comment_id = ${id} and reporter_id = ${anna}`;
  expect(report).toEqual({ reason: "spam", note: "Pubblicità di un concorrente", status: "open" });
  expect(await statusOf("Comprate da me, costo meno")).toBe("visible");

  // Altre due persone lo segnalano: alla terza segnalazione aperta non si vede più finché l'azienda non lo guarda.
  await sql`insert into comment_reports (comment_id, reporter_id, reason) values (${id}, ${extras[1]}, 'spam')`;
  const third = await enter(browser, "segnala3.commenti@example.com");
  await menu(third, "Sara B.").click();
  await third.getByText("Segnala", { exact: true }).click();
  await third.getByLabel("Spam o pubblicità").check();
  await third.getByRole("button", { name: "Invia segnalazione" }).click();
  await expect.poll(() => statusOf("Comprate da me, costo meno")).toBe("pending");
});

test("tetto di frequenza: dopo 5 commenti in un minuto bisogna aspettare", async ({ browser }) => {
  for (let i = 1; i <= 5; i++) await addComment(`Commento numero ${i}`);
  const page = await enter(browser, ANNA);
  await write(page, "Il sesto di fila");
  await expect(page.locator("form").getByRole("alert")).toHaveText("Stai commentando troppo in fretta: riprova tra poco.");
  expect((await sql`select 1 from portfolio_comments where portfolio_item_id = ${work}`).length).toBe(5);
});
