import { Badge, planBadge } from "@/components/ui/badge";
import { LogoPartner } from "@/components/ui/logo-partner";

export function PartnerPageHeader({
  title,
  subtitle,
  partnerName,
  planCode,
  status,
}: {
  title: string;
  subtitle?: string;
  partnerName: string;
  planCode?: string | null;
  status?: string;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h1">{title}</h1>
        {subtitle && <p className="text-body-s text-ink-2">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {planCode && (
          <span className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-body-s">
            <Badge kind={planBadge(planCode)} />
            {status && <span className="text-ink-2">{status}</span>}
          </span>
        )}
        <LogoPartner name={partnerName} size={40} />
      </div>
    </header>
  );
}
