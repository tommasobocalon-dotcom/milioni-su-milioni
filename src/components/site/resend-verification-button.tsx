"use client";

import { useState, useTransition } from "react";
import { resendEmailVerification } from "@/app/accedi/actions";
import { Button } from "@/components/ui/button";

export function ResendVerificationButton() {
  const [result, setResult] = useState<{ sent: boolean; devLink?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();

  if (result?.sent) {
    return (
      <p role="status" className="text-body-s font-semibold">
        Link inviato.{" "}
        {result.devLink && (
          <a href={result.devLink} className="underline">
            Aprilo (ambiente di prova)
          </a>
        )}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <Button
        size="s"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await resendEmailVerification();
            setResult(res.ok ? { sent: true, devLink: res.devLink } : { sent: false, error: res.error });
          })
        }
      >
        {pending ? "Invio…" : "Rimanda il link"}
      </Button>
      {result?.error && (
        <p role="alert" className="text-caption text-error">
          {result.error}
        </p>
      )}
    </div>
  );
}
