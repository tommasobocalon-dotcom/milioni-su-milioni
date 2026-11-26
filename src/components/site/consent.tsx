"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  conversionCalls,
  parseConsent,
  serializeConsent,
  trackingEnabled,
  type Conversion,
  type TrackingConfig,
} from "@/lib/domain/consent";

/**
 * Banner dei cookie e strumenti di misurazione delle pubblicità (Google Ads, pixel di Meta). Gli script di Google e Meta
 * si caricano solo dopo "Accetta"; senza ID configurati il banner non compare e non si carica nulla (DEPLOY.md).
 */
const config: TrackingConfig = {
  googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "",
  googleLabels: {
    lead: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL ?? "",
    signup: process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL ?? "",
    purchase: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL ?? "",
  },
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
};

/**
 * Banner di iubenda (Privacy Controls and Cookie Solution) al posto del nostro, se configurato (DEPLOY.md). Integrazione
 * classica senza blocco automatico: quello di iubenda blocca gli script inline di Next e Turnstile. Google e Meta li
 * carichiamo noi, solo con il consenso alla finalità 5 (marketing) di iubenda.
 */
const IUBENDA = {
  siteId: Number(process.env.NEXT_PUBLIC_IUBENDA_SITE_ID ?? ""),
  cookiePolicyId: Number(process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID ?? ""),
};
const useIubenda = Boolean(IUBENDA.siteId && IUBENDA.cookiePolicyId);
const IUBENDA_MARKETING = "5";

type Fn = (...args: unknown[]) => void;
type Fbq = Fn & { callMethod?: Fn; queue: unknown[][]; push: Fbq; loaded: boolean; version: string };
type IubendaPreference = { consent?: boolean; purposes?: Record<string, boolean> };
type Iubenda = { csConfiguration?: Record<string, unknown>; cs?: { api?: { openPreferences?: () => void } } };
type TrackingWindow = Window & { dataLayer?: unknown[]; gtag?: Fn; fbq?: Fbq; _fbq?: Fbq; _iub?: Iubenda };

let loaded = false;
/** Scelta fatta nel banner di iubenda: null finché iubenda non l'ha letta o chiesta. */
let iubendaMarketing: boolean | null = null;
/** Conversioni arrivate prima della scelta o prima del caricamento degli script: partono appena si può. */
const pending: Conversion[] = [];
let lastPath: string | null = null;

function readConsentRaw(): string {
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  return raw ? decodeURIComponent(raw) : "";
}

function readConsent() {
  if (useIubenda) return iubendaMarketing === null ? null : { marketing: iubendaMarketing };
  return parseConsent(readConsentRaw());
}

// La scelta salvata come "store" esterno: sul server non c'è (null), nel browser si rilegge dopo ogni scelta.
const CONSENT_CHANGED = "geco:consenso";
const subscribeConsent = (onChange: () => void) => {
  window.addEventListener(CONSENT_CHANGED, onChange);
  return () => window.removeEventListener(CONSENT_CHANGED, onChange);
};

function writeConsent(marketing: boolean) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(serializeConsent(marketing))}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

/** Cookie lasciati da Google e Meta: alla revoca si tolgono, sia sul dominio della pagina sia su quello principale. */
function clearTrackingCookies() {
  const domains = ["", `; Domain=${location.hostname}`, `; Domain=.${location.hostname.split(".").slice(-2).join(".")}`];
  for (const name of ["_fbp", "_fbc", "_gcl_au", "_gcl_aw", "_gcl_gb"]) {
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; Path=/${d}`;
  }
}

function loadScript(src: string) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function send(event: Conversion) {
  const w = window as TrackingWindow;
  for (const call of conversionCalls(event, config)) (call.to === "google" ? w.gtag : w.fbq)?.(...call.args);
}

function loadTrackers() {
  if (loaded) return;
  loaded = true;
  const w = window as TrackingWindow;
  if (config.googleAdsId) {
    w.dataLayer = w.dataLayer ?? [];
    // gtag vuole proprio l'oggetto `arguments`, non un array.
    w.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
    // Consent Mode v2: gli script partono solo dopo "Accetta", quindi pubblicità concessa e statistiche no (non usate).
    w.gtag("consent", "default", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "denied" });
    w.gtag("js", new Date());
    w.gtag("config", config.googleAdsId);
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.googleAdsId)}`);
  }
  if (config.metaPixelId) {
    // Lo stesso stub del codice ufficiale di Meta: mette in coda le chiamate finché fbevents.js non è caricato.
    const fbq = ((...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    }) as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    w.fbq = fbq;
    w._fbq = fbq;
    fbq("init", config.metaPixelId);
    fbq("track", "PageView");
    loadScript("https://connect.facebook.net/en_US/fbevents.js");
  }
  for (const event of pending.splice(0)) send(event);
}

/** Conversione (richiesta inviata, iscrizione, pagamento): parte solo con il consenso, una volta per pagina e scheda. */
export function TrackConversion({ event }: { event: Conversion }) {
  useEffect(() => {
    if (!trackingEnabled(config)) return;
    const key = `geco_conversione:${event}:${location.pathname}${location.search}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Senza sessionStorage si rischia solo di contarla due volte ricaricando.
    }
    const consent = readConsent();
    if (consent?.marketing && loaded) send(event);
    else if (!consent || consent.marketing) pending.push(event);
  }, [event]);
  return null;
}

/** Link "Preferenze cookie" del footer: riapre il banner per cambiare scelta. */
export function CookiePreferencesButton({ className }: { className?: string }) {
  if (!useIubenda && !trackingEnabled(config)) return null;
  const open = () =>
    useIubenda
      ? (window as TrackingWindow)._iub?.cs?.api?.openPreferences?.()
      : window.dispatchEvent(new Event("geco:cookie"));
  return (
    <button type="button" className={className} onClick={open}>
      Preferenze cookie
    </button>
  );
}

/** Applica la scelta: con il consenso carica Google e Meta, senza toglie i loro cookie (e ricarica se erano già partiti). */
function applyMarketing(marketing: boolean) {
  if (marketing) return loadTrackers();
  pending.length = 0;
  clearTrackingCookies();
  // Gli script già caricati non si possono togliere: si ricarica la pagina, che riparte senza.
  if (loaded) location.reload();
}

function loadIubenda() {
  const w = window as TrackingWindow;
  if (w._iub) return;
  const onPreference = (preference?: IubendaPreference) => {
    // Conta solo il marketing: con le sole finalità necessarie iubenda segna "consenso dato" senza chiedere niente.
    const marketing = preference?.purposes?.[IUBENDA_MARKETING] === true;
    if (marketing === iubendaMarketing) return;
    iubendaMarketing = marketing;
    applyMarketing(marketing);
  };
  w._iub = Object.assign([], {
    csConfiguration: {
      siteId: IUBENDA.siteId,
      cookiePolicyId: IUBENDA.cookiePolicyId,
      lang: "it",
      storage: { useSiteId: true },
      perPurposeConsent: true,
      askConsentAtCookiePolicyUpdate: true,
      // "Preferenze cookie" sta già nel footer: niente pulsante fluttuante sopra la pagina.
      floatingPreferencesButtonDisplay: false,
      banner: {
        position: "float-bottom-center",
        acceptButtonDisplay: true,
        rejectButtonDisplay: true,
        customizeButtonDisplay: true,
        closeButtonDisplay: false,
        explicitWithdrawal: true,
        listPurposes: true,
        showTitle: false,
      },
      callback: { onPreferenceExpressedOrNotNeeded: onPreference },
    },
  });
  loadScript("https://cdn.iubenda.com/cs/iubenda_cs.js");
}

export function ConsentBanner() {
  if (useIubenda) return <IubendaBanner />;
  return <OwnConsentBanner />;
}

function IubendaBanner() {
  useEffect(loadIubenda, []);
  return null;
}

function OwnConsentBanner() {
  const enabled = trackingEnabled(config);
  const saved = useSyncExternalStore(subscribeConsent, readConsentRaw, () => null);
  const [reopened, setReopened] = useState(false);
  const pathname = usePathname();
  const consent = saved === null ? null : parseConsent(saved);
  const open = enabled && saved !== null && (!consent || reopened);

  useEffect(() => {
    if (enabled && consent?.marketing) loadTrackers();
  }, [enabled, consent?.marketing]);

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener("geco:cookie", reopen);
    return () => window.removeEventListener("geco:cookie", reopen);
  }, []);

  // Navigazioni interne (senza ricaricare la pagina): una visita in più per Google e Meta.
  useEffect(() => {
    if (loaded && lastPath !== null && lastPath !== pathname) {
      const w = window as TrackingWindow;
      w.gtag?.("event", "page_view", { page_path: pathname });
      w.fbq?.("track", "PageView");
    }
    lastPath = pathname;
  }, [pathname]);

  if (!open) return null;

  const choose = (marketing: boolean) => {
    writeConsent(marketing);
    setReopened(false);
    window.dispatchEvent(new Event(CONSENT_CHANGED));
    applyMarketing(marketing);
  };

  return (
    <section
      aria-labelledby="cookie-titolo"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-lg md:flex-row md:items-end md:gap-6">
        <div className="flex flex-col gap-1.5">
          <h2 id="cookie-titolo" className="text-h4 font-semibold">
            Cookie
          </h2>
          <p className="text-body-s text-ink-2">
            Usiamo cookie tecnici per far funzionare il sito. Se accetti, usiamo anche cookie di Google e Meta per capire quali nostre
            pubblicità ti hanno portato qui e per mostrarti le nostre pubblicità su altri siti. Puoi cambiare idea quando vuoi da
            &quot;Preferenze cookie&quot; in fondo alla pagina.{" "}
            <Link href="/privacy#cookie" className="font-semibold text-primary underline">
              Informativa
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          {/* Stesso peso per le due scelte (Garante, linee guida cookie 2021). */}
          <Button type="button" variant="secondary" className="flex-1 md:flex-none" onClick={() => choose(false)}>
            Rifiuta
          </Button>
          <Button type="button" variant="secondary" className="flex-1 md:flex-none" onClick={() => choose(true)}>
            Accetta
          </Button>
        </div>
      </div>
    </section>
  );
}
