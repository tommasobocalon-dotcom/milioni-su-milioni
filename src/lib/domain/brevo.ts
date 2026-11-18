/** Richieste all'API di Brevo (email transazionali). Solo costruzione: l'invio sta in src/lib/notify. */

const API = "https://api.brevo.com/v3";

type Request = { url: string; init: RequestInit };

const headers = (apiKey: string) => ({ "api-key": apiKey, "content-type": "application/json", accept: "application/json" });

export function brevoEmailRequest({
  apiKey,
  from,
  fromName,
  to,
  subject,
  text,
  replyTo,
}: {
  apiKey: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  /** Dove arrivano le risposte (es. la casella dell'assistenza). */
  replyTo?: string;
}): Request {
  return {
    url: `${API}/smtp/email`,
    init: {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({ sender: { email: from, name: fromName }, to: [{ email: to }], subject, textContent: text, ...(replyTo ? { replyTo: { email: replyTo } } : {}) }),
    },
  };
}
