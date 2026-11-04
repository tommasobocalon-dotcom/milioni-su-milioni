export const LEAD_STATUSES = [
  { value: "new", label: "Nuova", tone: "bg-info-soft text-info" },
  { value: "seen", label: "Vista", tone: "bg-muted text-ink-2" },
  { value: "contacted", label: "Chiamata", tone: "bg-brand-soft text-brand" },
  { value: "quote_sent", label: "Preventivo inviato", tone: "bg-ambra-100 text-ink" },
  { value: "won", label: "Lavoro preso", tone: "bg-salvia-300 text-bosco-900" },
  { value: "lost", label: "Lavoro perso", tone: "bg-error-soft text-error" },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];

export const statusInfo = (s: string) => LEAD_STATUSES.find((x) => x.value === s) ?? LEAD_STATUSES[0];
