export type OpeningHour = { label: string; value: string };

const MAX_HOUR_ROWS = 10;
const MAX_SPECIALTIES = 12;

/** Orari scritti dal partner, una riga per fascia: "Lun–Ven: 8:00–18:00". Separa ai primi due punti. */
export function parseOpeningHours(text: string): OpeningHour[] | { error: string } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > MAX_HOUR_ROWS) return { error: `Al massimo ${MAX_HOUR_ROWS} righe di orari` };
  const hours: OpeningHour[] = [];
  for (const [i, line] of lines.entries()) {
    const at = line.indexOf(":");
    const label = line.slice(0, at).trim().slice(0, 40);
    const value = line.slice(at + 1).trim().slice(0, 60);
    if (at < 0 || !label || !value) return { error: `Scrivi gli orari come «Lun–Ven: 8:00–18:00» (riga ${i + 1})` };
    hours.push({ label, value });
  }
  return hours;
}

export const formatOpeningHours = (hours: OpeningHour[]) => hours.map((h) => `${h.label}: ${h.value}`).join("\n");

/** Specializzazioni separate da virgola, senza doppioni (maiuscole ignorate). */
export function parseSpecialties(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(",")) {
    const s = raw.trim().slice(0, 40);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  return out.slice(0, MAX_SPECIALTIES);
}
