"use client";

import { Ellipsis } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Menu "…" accanto a un commento: un <details> che si chiude da solo dopo un'azione (elimina, nascondi, blocca…) e
 * con Esc. I moduli che devono mostrare l'esito sul posto, come la segnalazione, hanno `data-keep-open`.
 */
export function CommentMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details
      className="relative shrink-0"
      onSubmit={(e) => {
        if (!(e.target as HTMLElement).hasAttribute("data-keep-open")) e.currentTarget.removeAttribute("open");
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.currentTarget.removeAttribute("open");
      }}
    >
      <summary
        aria-label={label}
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full text-ink-2 hover:bg-subtle hover:text-ink [&::-webkit-details-marker]:hidden"
      >
        <Ellipsis className="size-5" aria-hidden />
      </summary>
      <div className="absolute right-0 z-20 mt-1 flex w-72 flex-col gap-1 rounded-lg border border-line bg-surface p-2 shadow-float">{children}</div>
    </details>
  );
}
