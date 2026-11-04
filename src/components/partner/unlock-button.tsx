"use client";

import { useState, useTransition } from "react";
import { Coins } from "lucide-react";
import { unlockLeadAction } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";

export function UnlockButton({ leadId, tokens }: { leadId: string; tokens: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="s"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await unlockLeadAction(leadId);
            setError(res.error ?? null);
          })
        }
      >
        <Coins aria-hidden /> {pending ? "Sblocco…" : `Sblocca con ${tokens} crediti`}
      </Button>
      {error && (
        <p role="alert" className="text-caption text-error">
          {error}
        </p>
      )}
    </div>
  );
}
