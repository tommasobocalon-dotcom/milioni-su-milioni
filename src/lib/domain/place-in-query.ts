/**
 * Trova un comune scritto dentro la ricerca libera ("rifare il bagno a Mestre") e lo separa dal resto,
 * così la frase porta alla zona giusta anche se il campo Comune è vuoto.
 * Regole prevedibili: vince il primo comune nella frase; i nomi che sono anche parole comuni
 * ("Paese", "Terrazzo", "Mira"…) contano solo dopo "a" o "ad".
 */

export type PlaceName = { name: string; aliases: string[] };
export type PlaceMatch = { place: string; rest: string };

/** Comuni del Veneto che sono anche parole italiane comuni: senza "a"/"ad" davanti non si considerano. */
const AMBIGUOUS = new Set([
  "agna", "altissimo", "arcade", "arre", "badia", "canda", "carceri", "cona", "dolo", "erbe", "este", "fonte",
  "fosso", "gazzo", "granze", "loria", "lusia", "malo", "masi", "mira", "nove", "paese", "rosa", "sona", "stra",
  "terrazzo", "urbana", "vo",
]);

/** Parole che legano il luogo alla frase e vanno tolte insieme a lui ("in zona", "vicino a", "da"). */
const CONNECTORS = new Set(["a", "ad", "in", "di", "da", "presso", "zona", "vicino", "verso", "nei", "pressi"]);

function norm(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "");
}

function tokens(text: string): string[] {
  return text.replace(/-/g, " ").split(/[\s,;]+/).filter(Boolean);
}

type Candidate = { label: string; words: string[]; ambiguous: boolean };

function candidates(places: PlaceName[]): Candidate[] {
  const list: Candidate[] = [];
  for (const p of places) {
    for (const label of [p.name, ...p.aliases]) {
      const words = tokens(label).map(norm).filter(Boolean);
      if (words.length === 0) continue;
      list.push({ label, words, ambiguous: words.length === 1 && AMBIGUOUS.has(words[0]) });
    }
  }
  // I nomi più lunghi prima: "Lido di Venezia" vince su "Venezia".
  return list.sort((a, b) => b.words.length - a.words.length);
}

export function placeInQuery(query: string, places: PlaceName[]): PlaceMatch | null {
  const original = tokens(query);
  const words = original.map(norm);
  if (words.length === 0) return null;
  const list = candidates(places);

  for (let i = 0; i < words.length; i++) {
    for (const c of list) {
      if (i + c.words.length > words.length) continue;
      if (!c.words.every((w, k) => words[i + k] === w)) continue;
      const before = words[i - 1];
      if (c.ambiguous && before !== "a" && before !== "ad") continue;

      // Toglie il luogo e le parole che lo legano alla frase, al massimo tre all'indietro.
      let start = i;
      while (start > 0 && i - start < 3 && CONNECTORS.has(words[start - 1])) start--;
      const rest = [...original.slice(0, start), ...original.slice(i + c.words.length)].join(" ").trim();
      return { place: c.label, rest };
    }
  }
  return null;
}
