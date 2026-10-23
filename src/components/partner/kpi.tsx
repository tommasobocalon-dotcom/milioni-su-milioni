import type { LucideIcon } from "lucide-react";

/** Componente "Card KPI" di Figma. */
export function Kpi({ label, value, note, icon: Icon }: { label: string; value: string; note?: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5">
      <p className="inline-flex items-center gap-2 text-body-s text-ink-2">
        <Icon className="size-4" aria-hidden /> {label}
      </p>
      <p className="font-display text-h1">{value}</p>
      {note && <p className="text-caption text-ink-2">{note}</p>}
    </div>
  );
}
