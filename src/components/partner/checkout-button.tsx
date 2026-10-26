"use client";

import { useState, useTransition, type ComponentProps, type ReactNode } from "react";
import type { CheckoutState } from "@/app/area-partner/actions";
import { Button } from "@/components/ui/button";

/** Crea la sessione Stripe sul server e porta il partner alla pagina di pagamento o al portale. */
export function CheckoutButton({ action, children, ...props }: { action: () => Promise<CheckoutState> } & Omit<ComponentProps<typeof Button>, "onClick">) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Button
        {...props}
        disabled={pending || props.disabled}
        onClick={() =>
          start(async () => {
            const res = await action();
            if (res.url) window.location.assign(res.url);
            else setError(res.error);
          })
        }
      >
        {pending ? "Apertura di Stripe…" : children}
      </Button>
      {error && (
        <p role="alert" className="text-body-s text-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Ritorno dal Checkout: il pagamento è avviato, la conferma arriva dal webhook. */
export function PaymentNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-lg bg-subtle p-4 text-body-s">
      <strong>Pagamento avviato.</strong> {children}
    </p>
  );
}
