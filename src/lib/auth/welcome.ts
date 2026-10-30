/**
 * Transizione di benvenuto dopo l'accesso (components/site/welcome.tsx).
 *
 * Il server, quando crea la sessione, lascia un cookie di un minuto leggibile dal browser; la prima pagina
 * dopo l'accesso lo consuma e accende l'attributo WELCOME_ATTRIBUTE su <html>, che mostra il sipario.
 * Così nessuna pagina legge i cookie sul server (restano statiche) e il cookie di sessione resta httpOnly.
 */
export const WELCOME_COOKIE = "geco_benvenuto";
export const WELCOME_ATTRIBUTE = "data-benvenuto";

/** Legge e cancella il cookie di benvenuto. true se la transizione deve partire. */
export function takeWelcome(): boolean {
  if (!document.cookie.split("; ").includes(`${WELCOME_COOKIE}=1`)) return false;
  document.cookie = `${WELCOME_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  return true;
}

/**
 * Script in <head> per le navigazioni complete (ritorno da Google e Apple): accende il sipario prima del
 * primo disegno, così la pagina non compare per un istante prima della transizione.
 */
export const WELCOME_HEAD_SCRIPT = `(function(){try{var c=${JSON.stringify(`${WELCOME_COOKIE}=`)};if(document.cookie.split("; ").indexOf(c+"1")<0)return;document.cookie=c+"; Max-Age=0; Path=/; SameSite=Lax";document.documentElement.setAttribute(${JSON.stringify(WELCOME_ATTRIBUTE)},"")}catch(e){}})()`;
