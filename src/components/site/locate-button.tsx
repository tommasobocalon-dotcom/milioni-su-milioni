"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { roundCoord } from "@/lib/domain/nearby";

const MESSAGES = {
  denied: "Non abbiamo la tua posizione: scrivi il tuo comune.",
  unsupported: "Questo browser non condivide la posizione: scrivi il tuo comune.",
} as const;

/**
 * "Usa la mia posizione": chiede la posizione al browser solo al clic e apre /vicino-a-te con le coordinate
 * arrotondate a circa un chilometro. Nulla viene salvato.
 */
export function LocateButton({
  radiusKm,
  category,
  variant = "primary",
  className,
}: {
  radiusKm?: number;
  category?: string;
  variant?: "primary" | "secondary" | "light";
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "asking" | keyof typeof MESSAGES>("idle");

  function locate() {
    if (!("geolocation" in navigator)) return setState("unsupported");
    setState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const q = new URLSearchParams({ lat: String(roundCoord(pos.coords.latitude)), lng: String(roundCoord(pos.coords.longitude)) });
        if (radiusKm) q.set("raggio", String(radiusKm));
        if (category) q.set("categoria", category);
        setState("idle");
        router.push(`/vicino-a-te?${q}`);
      },
      () => setState("denied"),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60_000 },
    );
  }

  return (
    <div className={className}>
      <Button type="button" variant={variant} onClick={locate} disabled={state === "asking"}>
        <LocateFixed aria-hidden /> {state === "asking" ? "Cerco la tua posizione…" : "Usa la mia posizione"}
      </Button>
      <p role="status" className="mt-2 text-body-s empty:hidden">
        {state === "denied" || state === "unsupported" ? MESSAGES[state] : ""}
      </p>
    </div>
  );
}
