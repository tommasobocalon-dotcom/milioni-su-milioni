"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { takeWelcome, WELCOME_ATTRIBUTE } from "@/lib/auth/welcome";

const WORDMARK = "gecoitalia";

/** Le animazioni che chiudono il sipario: quella normale e quella con "riduci movimento". */
const LAST_ANIMATIONS = new Set(["benvenuto-sipario", "benvenuto-dissolvi"]);

/**
 * Accende e spegne il sipario di WelcomeOverlay. Legge il percorso (usePathname), quindi va dentro <Suspense>;
 * il sipario invece sta fuori, così c'è già nell'HTML statico quando lo script in <head> lo accende.
 */
export function WelcomeTransition() {
  const pathname = usePathname();

  // Prima che la nuova pagina venga disegnata: l'accesso con email e password arriva con una navigazione interna.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (takeWelcome()) root.setAttribute(WELCOME_ATTRIBUTE, "");
    if (!root.hasAttribute(WELCOME_ATTRIBUTE)) return;

    const end = () => {
      root.removeAttribute(WELCOME_ATTRIBUTE);
      cleanup();
    };
    const onAnimationEnd = (e: AnimationEvent) => {
      if (LAST_ANIMATIONS.has(e.animationName)) end();
    };
    // Un tocco o un tasto saltano la transizione; il timer è la rete se l'evento di fine non arriva.
    const timer = window.setTimeout(end, 4000);
    document.addEventListener("animationend", onAnimationEnd);
    document.addEventListener("pointerdown", end);
    document.addEventListener("keydown", end);
    function cleanup() {
      window.clearTimeout(timer);
      document.removeEventListener("animationend", onAnimationEnd);
      document.removeEventListener("pointerdown", end);
      document.removeEventListener("keydown", end);
    }
    return cleanup;
  }, [pathname]);

  return null;
}

/**
 * Sipario dopo l'accesso: "gecoitalia" al centro e il geco che attraversa lo schermo dall'angolo in alto a
 * sinistra a quello in basso a destra; dietro di lui il sipario si apre in diagonale sulla pagina.
 * Le animazioni sono in globals.css (.benvenuto-*) e partono quando <html> ha l'attributo data-benvenuto.
 */
export function WelcomeOverlay() {
  return (
    <div className="benvenuto" aria-hidden="true">
      <div className="benvenuto-sipario">
        <p className="benvenuto-marchio">
          {[...WORDMARK].map((letter, i) => (
            <span key={i} style={{ "--i": i } as React.CSSProperties}>
              {letter}
            </span>
          ))}
        </p>
        <p className="benvenuto-nota">Accesso effettuato</p>
      </div>
      <div className="benvenuto-geco" />
    </div>
  );
}
