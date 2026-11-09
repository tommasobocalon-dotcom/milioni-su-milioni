/** Numero di pagina da `?pagina=`: solo interi positivi, altrimenti la prima pagina. */
export function parsePage(value: string | undefined): number {
  return value && /^[1-9]\d*$/.test(value) ? Number(value) : 1;
}

/**
 * Elementi della pagina richiesta; una pagina oltre l'ultima mostra l'ultima.
 * `firstSize` permette una prima pagina più corta (nei risultati c'è anche il riquadro grande in evidenza).
 */
export function pageItems<T>(
  items: T[],
  page: number,
  size: number,
  firstSize = size,
): { items: T[]; page: number; pages: number } {
  const pages = 1 + Math.ceil(Math.max(0, items.length - firstSize) / size);
  const current = Math.min(Math.max(1, page), pages);
  const start = current === 1 ? 0 : firstSize + (current - 2) * size;
  return { items: items.slice(start, current === 1 ? firstSize : start + size), page: current, pages };
}

/** Numeri da mostrare nella paginazione: prima, ultima, la corrente e le vicine; "…" al posto dei salti di più pagine. */
export function pageNumbers(current: number, pages: number): (number | "…")[] {
  const shown = [...new Set([1, current - 1, current, current + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (const n of shown) {
    const prev = out.at(-1);
    if (typeof prev === "number" && n - prev === 2) out.push(prev + 1);
    else if (typeof prev === "number" && n - prev > 2) out.push("…");
    out.push(n);
  }
  return out;
}
