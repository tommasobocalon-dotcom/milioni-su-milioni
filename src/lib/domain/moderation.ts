/**
 * Sanzioni per i commenti (13/11/2026). Una violazione è un commento tolto dal gestionale perché contrario alle
 * regole. La scala è a gradini e si legge dalle violazioni non annullate: la prima è un avviso, la seconda ferma i
 * commenti per 7 giorni, la terza per 30, dalla quarta sono bloccati. Riguarda solo i commenti: l'account continua
 * a entrare, mettere mi piace, seguire e mandare richieste. Ogni decisione arriva per email con il motivo e si può
 * contestare dall'assistenza; se la contestazione è accolta la violazione viene annullata e non conta più.
 */
export type Sanction =
  | { level: "none"; strikes: 0 }
  | { level: "warning"; strikes: number }
  | { level: "suspended"; strikes: number; until: Date }
  | { level: "blocked"; strikes: number };

const DAY = 24 * 3600_000;
const SUSPENSION_DAYS: Record<number, number> = { 2: 7, 3: 30 };

/** Sanzione in vigore a `now`, dalle date delle violazioni non annullate. */
export function sanctionFor(strikes: Date[], now: Date): Sanction {
  const n = strikes.length;
  if (n === 0) return { level: "none", strikes: 0 };
  if (n >= 4) return { level: "blocked", strikes: n };
  const days = SUSPENSION_DAYS[n];
  if (!days) return { level: "warning", strikes: n };
  const latest = Math.max(...strikes.map((d) => d.getTime()));
  const until = new Date(latest + days * DAY);
  return now < until ? { level: "suspended", strikes: n, until } : { level: "warning", strikes: n };
}

const date = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

/** Messaggio per chi prova a commentare mentre non può, oppure null. */
export function commentBan(s: Sanction): string | null {
  if (s.level === "suspended") return `Non puoi commentare fino al ${date.format(s.until)}: abbiamo tolto dei tuoi commenti perché contrari alle regole.`;
  if (s.level === "blocked") return "Non puoi più commentare: abbiamo tolto più volte dei tuoi commenti perché contrari alle regole.";
  return null;
}

/** Cosa comporta la prossima violazione per chi ne ha già `activeStrikes`. */
export function nextSanctionLabel(activeStrikes: number): string {
  if (activeStrikes <= 0) return "avviso";
  if (activeStrikes === 1) return "stop ai commenti per 7 giorni";
  if (activeStrikes === 2) return "stop ai commenti per 30 giorni";
  return "blocco dei commenti";
}

/**
 * Email a chi ha scritto il commento tolto: cosa, perché, cosa comporta e come contestare (la "motivazione" che il
 * regolamento europeo sui servizi digitali chiede a chi ospita contenuti).
 */
export function strikeEmail(m: { name: string; body: string; reasonLabel: string; workTitle: string; sanction: Sanction; appUrl: string }): { subject: string; text: string } {
  const first = m.name.trim().split(/\s+/)[0] || "";
  const quoted = m.body.length > 200 ? `${m.body.slice(0, 200)}…` : m.body;
  const consequence =
    m.sanction.level === "suspended"
      ? `È la tua violazione numero ${m.sanction.strikes}: non potrai commentare fino al ${date.format(m.sanction.until)}.`
      : m.sanction.level === "blocked"
        ? `È la tua violazione numero ${m.sanction.strikes}: non potrai più commentare.`
        : "Per ora è solo un avviso: puoi continuare a commentare. Alla prossima violazione i commenti si fermano per 7 giorni.";
  return {
    subject: "Abbiamo tolto un tuo commento su GecoItalia",
    text: [
      `Ciao ${first},`,
      `abbiamo tolto un tuo commento sotto il lavoro "${m.workTitle}":`,
      `"${quoted}"`,
      `Motivo: ${m.reasonLabel}. Le regole dei commenti sono nei termini: ${m.appUrl}/termini`,
      consequence,
      `Il resto del tuo account funziona come prima. Se pensi che ci siamo sbagliati scrivici da ${m.appUrl}/assistenza indicando il commento: una persona lo riguarda e, se hai ragione, lo rimettiamo e la violazione non conta più.`,
      "Il team di GecoItalia",
    ].join("\n\n"),
  };
}
