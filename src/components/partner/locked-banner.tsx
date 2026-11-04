import { Coins } from "lucide-react";
import { TOKEN_COST_PER_LEAD } from "@/lib/domain/lead-rules";
import { UnlockButton } from "./unlock-button";

export function LockedLeadsBanner({
  leads,
  now,
}: {
  leads: { id: string; requestType: string; municipality: string; unlockExpiresAt: Date | null }[];
  now: Date;
}) {
  if (leads.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {leads.map((l) => {
        const hours = l.unlockExpiresAt ? Math.max(0, Math.floor((l.unlockExpiresAt.getTime() - now.getTime()) / 3600_000)) : 0;
        return (
          <li key={l.id} className="flex flex-col gap-3 rounded-lg bg-ambra-100 p-4 sm:flex-row sm:items-center">
            <Coins className="size-5 shrink-0" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold">
                Richiesta extra · {l.requestType} · {l.municipality}
              </p>
              <p className="text-body-s text-neutro-700">
                Hai già usato le richieste incluse nel piano. Per vedere il numero del cliente usa {TOKEN_COST_PER_LEAD} crediti
                {hours < 1 ? "entro un'ora" : `entro ${hours} ore`}, altrimenti il cliente riceverà altre proposte.
              </p>
            </div>
            <UnlockButton leadId={l.id} tokens={TOKEN_COST_PER_LEAD} />
          </li>
        );
      })}
    </ul>
  );
}
