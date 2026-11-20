import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export { TicketStatusPill } from "@/components/ui/ticket-status";

/** Pezzi comuni delle pagine del gestionale. */

export function AdminPageHeader({ title, subtitle, back, children }: { title: string; subtitle?: string; back?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-3">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 self-start text-body-s font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-h1 break-words">{title}</h1>
          {subtitle && <p className="text-body-s text-ink-2">{subtitle}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}

const PILL = "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-caption font-semibold whitespace-nowrap";

const ACCOUNT = {
  active: { label: "Attivo", style: "bg-subtle text-primary" },
  activating: { label: "In attivazione", style: "bg-info-soft text-info" },
  suspended: { label: "Sospeso", style: "bg-error-soft text-error" },
  cancelled: { label: "Disdetto", style: "bg-muted text-ink-2" },
} as const;

export function AccountStatusPill({ status }: { status: keyof typeof ACCOUNT }) {
  return <span className={cn(PILL, ACCOUNT[status].style)}>{ACCOUNT[status].label}</span>;
}

const VERIFICATION = {
  verified: { label: "Verificato", style: "bg-subtle text-primary" },
  pending: { label: "Da verificare", style: "bg-sponsor text-ink" },
  rejected: { label: "Verifica respinta", style: "bg-error-soft text-error" },
} as const;

export function VerificationPill({ status }: { status: keyof typeof VERIFICATION }) {
  return <span className={cn(PILL, VERIFICATION[status].style)}>{VERIFICATION[status].label}</span>;
}

export function Panel({ title, children, className, action }: { title?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("flex flex-col rounded-lg border border-line bg-surface", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-h4 font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-8 text-center text-body-s text-ink-2">{children}</p>;
}

export function AdminSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Caricamento">
      <div className="h-11 w-72 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded-lg bg-muted" />
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export const dateTime = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
export const dateOnly = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" });

const ACTION_LABEL: Record<string, string> = {
  "auth.signup": "Registrazione",
  "auth.login_failed": "Password sbagliata",
  "auth.password_reset": "Password reimpostata",
  "auth.email_verified": "Email confermata",
  "auth.oauth_signup": "Registrazione con Google/Apple",
  "auth.oauth_linked": "Google/Apple collegato",
  "partner.signup": "Registrazione azienda",
  "partner.profile_updated": "Scheda modificata",
  "partner.verification": "Verifica cambiata",
  "partner.suspend": "Partner sospeso",
  "partner.reactivate": "Partner riattivato",
  "partner.google_linked": "Scheda Google collegata (sistema dismesso)",
  "partner.google_unlinked": "Scheda Google scollegata (sistema dismesso)",
  "price_list.added": "Voce di listino aggiunta",
  "price_list.updated": "Listino modificato",
  "price_list.removed": "Voce di listino tolta",
  "tokens.credit": "Accredito manuale (sistema dismesso)",
  "tokens.simulated_purchase": "Acquisto di prova (sistema dismesso)",
  "billing.simulated_subscription": "Piano attivato senza pagamento (prova)",
  "billing.free_plan": "Piano gratuito di lancio attivato",
  "billing.subscription_checkout": "Aperto il pagamento del piano",
  "billing.plan_change": "Cambio di piano",
  "billing.portal": "Aperto il portale dei pagamenti",
  "billing.home_sponsor_checkout": "Aperto il pagamento del logo in Home",
  "billing.search_boost_checkout": "Aperto il pagamento del boost",
  "billing.area_extension_checkout": "Aperto il pagamento dei comuni in più",
  "billing.token_checkout": "Acquisto crediti (sistema dismesso)",
  "billing.simulated_home_sponsor": "Logo in Home attivato senza pagamento (prova)",
  "billing.simulated_search_boost": "Boost attivato senza pagamento (prova)",
  "billing.simulated_area_extension": "Comuni in più attivati senza pagamento (prova)",
  "boost.activated": "Boost attivato",
  "lead.report": "Lead segnalato",
  "lead.report_accept": "Segnalazione accolta",
  "lead.report_reject": "Segnalazione respinta",
  "review.status": "Recensione moderata (sistema dismesso)",
  "support.ticket_opened": "Richiesta di assistenza aperta",
  "support.reply": "Risposta dell'assistenza",
  "support.status": "Stato della richiesta cambiato",
};

export const actionLabel = (action: string) => ACTION_LABEL[action] ?? action;

/** "5 min fa", "3 h fa", "2 gg fa": per capire a colpo d'occhio da quanto aspetta una richiesta. */
export function ago(date: Date, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h fa`;
  return `${Math.round(hours / 24)} gg fa`;
}
