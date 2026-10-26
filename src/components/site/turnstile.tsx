"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<void> | undefined;
function loadScript(): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = undefined;
      reject(new Error("Turnstile non caricato"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Controllo antispam di Cloudflare. Di solito non chiede niente: compare solo se il traffico è sospetto.
 * Senza NEXT_PUBLIC_TURNSTILE_SITE_KEY non mostra nulla (sviluppo e test).
 * `resetKey`: cambiandolo si chiede un token nuovo (i token valgono una volta sola).
 */
export function Turnstile({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  });

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let cancelled = false;
    const el = box.current;
    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        widget.current = window.turnstile.render(el, {
          sitekey: SITE_KEY,
          language: "it",
          appearance: "interaction-only",
          callback: (t: string) => callback.current(t),
          "expired-callback": () => callback.current(""),
          "error-callback": () => callback.current(""),
        });
      })
      .catch(() => callback.current(""));
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey && widget.current) {
      callback.current("");
      window.turnstile?.reset(widget.current);
    }
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={box} className="min-h-0 empty:hidden" />;
}
