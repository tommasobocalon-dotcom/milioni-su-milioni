import { Award, Star } from "lucide-react";
import { LogoPartner } from "@/components/ui/logo-partner";

const PLAN = {
  premium: { label: "Partner Elite", icon: <Star className="size-3.5 fill-star text-star" aria-hidden /> },
  normal: { label: "Partner Pro", icon: <Award className="size-3.5 text-primary" aria-hidden /> },
} as const;

export function PartnerPageHeader({
  title,
  subtitle,
  partnerName,
  logoUrl,
  planCode,
}: {
  title: string;
  subtitle?: string;
  partnerName: string;
  logoUrl?: string | null;
  planCode?: string | null;
}) {
  const plan = planCode === "premium" || planCode === "normal" ? PLAN[planCode] : null;
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h1">{title}</h1>
        {subtitle && <p className="text-body-s text-ink-2">{subtitle}</p>}
      </div>
      {/* Un solo blocco "chi sei": logo, nome dell'azienda e piano, senza riquadri uno dentro l'altro. */}
      <div className="flex items-center gap-3 self-start rounded-lg border border-line bg-surface py-2 pr-4 pl-2">
        <LogoPartner name={partnerName} src={logoUrl} size={40} />
        <div className="flex min-w-0 flex-col">
          <span className="max-w-56 truncate text-body-s font-semibold">{partnerName}</span>
          {planCode && (
            <span className="flex items-center gap-1 text-caption text-ink-2">
              {plan?.icon}
              {plan?.label ?? "Piano Base"}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
