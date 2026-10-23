"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { markLeadSeen, reportLead, type ReportState } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { REPORT_REASONS } from "@/lib/domain/lead-rules";

/** Segna il lead come "visto" quando il partner lo apre davvero (non durante i prefetch). */
export function MarkSeen({ leadId, isNew }: { leadId: string; isNew: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (isNew) void markLeadSeen(leadId).then(() => router.refresh());
  }, [leadId, isNew, router]);
  return null;
}

export function ReportForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(reportLead.bind(null, leadId), {});
  if (state.ok) return <p className="text-body-s font-semibold text-primary">Segnalazione inviata: ti rispondiamo entro 2 giorni lavorativi.</p>;
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="reason" className="text-body-s font-semibold">
        Motivo
      </label>
      <Select id="reason" name="reason" defaultValue="" required>
        <option value="" disabled>
          Scegli un motivo…
        </option>
        {REPORT_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </Select>
      {state.error && (
        <p role="alert" className="text-caption text-error">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="danger" size="s" disabled={pending}>
        <Flag aria-hidden /> Segnala lead non valido
      </Button>
    </form>
  );
}
